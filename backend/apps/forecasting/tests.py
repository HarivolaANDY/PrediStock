"""
Données d'entrée des prévisions (apps/forecasting/services.py).

Les prévisions ne doivent compter que les flux RÉELS : un achat ou une vente annulé(e) laisse deux
mouvements (l'original et son inverse) qui ne sont ni de la demande ni de l'approvisionnement.
Ces tests n'exécutent pas les modèles de machine learning : ils vérifient les données qu'on leur donne.

Ils tournent sur la base de test créée puis détruite par Django : db.sqlite3 n'est pas touchée.
"""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.catalogue.models import Product
from apps.stock.models import MouvementStock
from .services import historique_journalier, taux_journaliers


class ServicesPrevisionTests(TestCase):
    def setUp(self):
        self.produit = Product.objects.create(name="Eau 1.5L", sku="EAU", price=1000, current_stock=0, stock_threshold=1)
        self.autre = Product.objects.create(name="Jus 33cl", sku="JUS", price=500, current_stock=0, stock_threshold=1)
        self.aujourdhui = timezone.now().date()
        self.depuis = self.aujourdhui - timedelta(days=30)

    # ── Aides ────────────────────────────────────────────────────────────────────────────

    def _mvt(self, type_mvt, qte, produit=None, **extra):
        return MouvementStock.objects.create(produit=produit or self.produit, movement_type=type_mvt, quantity=qte, **extra)

    def _paire_annulee(self, type_mvt="IN", qte=5, produit=None):
        """Original + mouvement inverse lié : ce que produit l'annulation d'un achat (IN) ou d'une vente (OUT)."""
        original = self._mvt(type_mvt, qte, produit=produit)
        inverse = self._mvt("OUT" if type_mvt == "IN" else "IN", qte, produit=produit, annule=original)
        return original, inverse

    # ── historique_journalier ────────────────────────────────────────────────────────────

    def test_sans_mouvement_l_historique_est_vide(self):
        self.assertEqual(historique_journalier(self.produit, self.depuis), {})

    def test_agrege_les_entrees_et_les_sorties_du_jour(self):
        self._mvt("IN", 10)
        self._mvt("IN", 5)
        self._mvt("OUT", 3)
        self.assertEqual(historique_journalier(self.produit, self.depuis),
                         {self.aujourdhui: {"entree": 15, "sortie": 3}})

    def test_un_achat_livre_puis_annule_ne_compte_ni_comme_entree_ni_comme_sortie(self):
        self._paire_annulee("IN", 5)
        self.assertEqual(historique_journalier(self.produit, self.depuis), {})  # fallback heuristique, comme sans historique

    def test_une_vente_livree_puis_annulee_ne_compte_pas_comme_demande(self):
        self._mvt("IN", 20)
        self._paire_annulee("OUT", 8)
        self.assertEqual(historique_journalier(self.produit, self.depuis),
                         {self.aujourdhui: {"entree": 20, "sortie": 0}})

    def test_les_flux_reels_restent_comptes_a_cote_d_une_annulation(self):
        self._mvt("OUT", 4)
        self._paire_annulee("OUT", 8)
        self.assertEqual(historique_journalier(self.produit, self.depuis)[self.aujourdhui]["sortie"], 4)

    def test_l_inverse_d_un_achat_n_est_pas_pris_pour_une_vente(self):
        """Avant la correction, la sortie d'annulation d'un achat gonflait la demande."""
        self._paire_annulee("IN", 50)
        self._mvt("OUT", 2)
        self.assertEqual(historique_journalier(self.produit, self.depuis)[self.aujourdhui],
                         {"entree": 0, "sortie": 2})

    def test_une_annulation_manuelle_du_module_stock_est_aussi_ignoree(self):
        original = self._mvt("OUT", 6)
        self._mvt("IN", 6, annule=original)  # ce que crée l'action « annuler » du module Stock
        self.assertEqual(historique_journalier(self.produit, self.depuis), {})

    def test_les_anciens_mouvements_sans_lien_d_annulation_comptent_toujours(self):
        self._mvt("OUT", 7)  # enregistrement antérieur aux mouvements inverses
        self.assertEqual(historique_journalier(self.produit, self.depuis)[self.aujourdhui]["sortie"], 7)

    def test_ne_retient_que_le_produit_demande(self):
        self._mvt("OUT", 7, produit=self.autre)
        self.assertEqual(historique_journalier(self.produit, self.depuis), {})

    def test_les_mouvements_anterieurs_a_la_date_de_debut_sont_ignores(self):
        self._mvt("OUT", 3)
        ancien = self._mvt("OUT", 9)
        MouvementStock.objects.filter(pk=ancien.pk).update(timestamp=timezone.now() - timedelta(days=60))
        self.assertEqual(historique_journalier(self.produit, self.depuis)[self.aujourdhui]["sortie"], 3)

    def test_comportement_historique_conserve_les_types_autres_que_in_comptent_comme_sorties(self):
        """Documenté dans services.py : RETURN / ADJUSTMENT / ALLOCATION sont comptés comme des sorties."""
        self._mvt("RETURN", 2)
        self._mvt("ADJUSTMENT", 1)
        self.assertEqual(historique_journalier(self.produit, self.depuis)[self.aujourdhui]["sortie"], 3)

    # ── taux_journaliers ─────────────────────────────────────────────────────────────────

    def test_taux_moyens_sur_la_periode(self):
        self._mvt("IN", 90)
        self._mvt("OUT", 45)
        self.assertEqual(taux_journaliers(self.produit, self.aujourdhui, jours=90), (1.0, 0.5))

    def test_taux_nuls_sans_mouvement(self):
        self.assertEqual(taux_journaliers(self.produit, self.aujourdhui), (0, 0))

    def test_taux_ignorent_les_paires_annulees(self):
        self._mvt("OUT", 18)
        self._paire_annulee("OUT", 900)
        self._paire_annulee("IN", 900)
        taux_entree, taux_sortie = taux_journaliers(self.produit, self.aujourdhui, jours=90)
        self.assertEqual((float(taux_entree), round(float(taux_sortie), 6)), (0.0, 0.2))  # 18 / 90

    def test_taux_ne_retiennent_que_in_et_out(self):
        self._mvt("RETURN", 90)
        self._mvt("SCRAP", 90)
        self.assertEqual(taux_journaliers(self.produit, self.aujourdhui, jours=90), (0, 0))

    def test_taux_ignorent_les_mouvements_hors_periode(self):
        ancien = self._mvt("OUT", 900)
        MouvementStock.objects.filter(pk=ancien.pk).update(timestamp=timezone.now() - timedelta(days=200))
        self.assertEqual(taux_journaliers(self.produit, self.aujourdhui, jours=90), (0, 0))


class CommandePrevisionTests(TestCase):
    """La commande reste importable après l'extraction (elle charge pandas / scikit-learn / xgboost)."""

    def test_la_commande_utilise_les_services_extraits(self):
        from apps.forecasting.management.commands import prevision
        self.assertIs(prevision.historique_journalier, historique_journalier)
        self.assertIs(prevision.taux_journaliers, taux_journaliers)
        self.assertTrue(hasattr(prevision.Command, "handle"))
