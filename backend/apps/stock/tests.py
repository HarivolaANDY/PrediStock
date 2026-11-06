"""
Statistiques de flux du module Stock (MouvementStockViewSet : stats, chart, chart_by_category,
chart_by_product) et règle des mouvements « effectifs ».

Une annulation (achat/vente livré puis annulé, ou action `annuler` du module Stock) conserve le
mouvement d'origine et ajoute un mouvement INVERSE lié via `annule`. Les deux se compensent sur le
stock ; les statistiques de flux doivent donc les ignorer tous les deux, sinon un achat annulé
gonflerait à la fois les entrées et les sorties.

Ces tests tournent sur la base de test créée puis détruite par Django : db.sqlite3 n'est pas touchée.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.catalogue.models import Category, Product
from .models import MouvementStock


def _client(user):
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


class StatistiquesDeFluxTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="stockuser", email="stock@predistock.com", password="Pass123",
            first_name="Stock", last_name="User",
        )
        self.client = _client(self.user)
        self.categorie = Category.objects.create(name="Épicerie")
        self.riz = Product.objects.create(name="Riz 25kg", sku="RIZ", price=1000, current_stock=100,
                                          stock_threshold=10, category=self.categorie)
        self.sucre = Product.objects.create(name="Sucre 1kg", sku="SUC", price=500, current_stock=100,
                                            stock_threshold=10, category=self.categorie)

    # ── Données ──────────────────────────────────────────────────────────────────────────

    def _mvt(self, produit, type_mvt, qte, **extra):
        return MouvementStock.objects.create(produit=produit, movement_type=type_mvt, quantity=qte,
                                             utilisateur=self.user, **extra)

    def _paire_annulee(self, produit, type_mvt="IN", qte=5):
        """Original + mouvement inverse lié (ce que produit l'annulation d'un achat livré)."""
        original = self._mvt(produit, type_mvt, qte, reason="Livraison BC BC-00001")
        inverse = self._mvt(produit, "OUT" if type_mvt == "IN" else "IN", qte,
                            reason="Annulation de la livraison BC BC-00001", annule=original)
        return original, inverse

    def _scenario(self):
        """Flux réels : +10 et −3 sur le riz. Achat annulé : +5 puis −5 sur le sucre."""
        self._mvt(self.riz, "IN", 10)
        self._mvt(self.riz, "OUT", 3)
        self._paire_annulee(self.sucre)

    def _data(self, name, **params):
        response = self.client.get(reverse(name), params)
        self.assertEqual(response.status_code, 200)
        return response.data["data"]

    # ── Règle « effectifs » ──────────────────────────────────────────────────────────────

    def test_effectifs_exclut_l_original_annule_et_son_inverse(self):
        self._scenario()
        self.assertEqual(MouvementStock.objects.count(), 4)
        self.assertEqual(MouvementStock.objects.effectifs().count(), 2)
        self.assertEqual(MouvementStock.effectifs().count(), 2)  # raccourci de classe équivalent

    def test_effectifs_est_chainable_apres_un_filtre(self):
        self._scenario()
        self.assertEqual(MouvementStock.objects.filter(produit=self.sucre).effectifs().count(), 0)
        self.assertEqual(MouvementStock.objects.filter(produit=self.riz).effectifs().count(), 2)

    def test_les_mouvements_sans_lien_d_annulation_restent_effectifs(self):
        self._mvt(self.riz, "IN", 4)  # ancien enregistrement, antérieur aux mouvements inverses
        self.assertEqual(MouvementStock.effectifs().count(), 1)

    def test_les_stocks_restent_justes_malgre_l_exclusion(self):
        self._scenario()
        self.riz.refresh_from_db()
        self.sucre.refresh_from_db()
        self.assertEqual((self.riz.current_stock, self.sucre.current_stock), (107, 100))

    # ── /stock/mouvements/stats/ ─────────────────────────────────────────────────────────

    def test_stats_ne_compte_que_les_flux_reels(self):
        self._scenario()
        self.assertEqual(self._data("mouvement-stock-stats"), {
            "total": 2, "entrees": 1, "sorties": 1, "ajustements": 0, "autres": 0,
        })

    # ── /stock/mouvements/chart/ ─────────────────────────────────────────────────────────

    def test_chart_ignore_les_paires_annulees(self):
        self._scenario()
        data = self._data("mouvement-stock-chart", range="day")
        self.assertEqual(len(data), 1)
        point = data[0]
        # sans le filtre : inbound 15, outbound 8 (le net serait le même, les volumes non)
        self.assertEqual((point["inbound"], point["outbound"], point["net"]), (10, 3, 7))

    def test_chart_sans_aucun_flux_reel_est_vide(self):
        self._paire_annulee(self.sucre)
        self.assertEqual(self._data("mouvement-stock-chart", range="month"), [])

    def test_chart_conserve_le_filtre_de_recherche(self):
        self._scenario()
        self._mvt(self.sucre, "IN", 2, reason="Réception spéciale")
        data = self._data("mouvement-stock-chart", range="day", search="spéciale")
        self.assertEqual((data[0]["inbound"], data[0]["outbound"]), (2, 0))

    # ── /stock/mouvements/chart_by_category/ ─────────────────────────────────────────────

    def test_chart_by_category_ignore_les_paires_annulees(self):
        self._scenario()
        data = self._data("mouvement-stock-chart-by-category")
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["category"], "Épicerie")
        self.assertEqual((data[0]["inbound"], data[0]["outbound"], data[0]["net"]), (10, 3, 7))

    # ── /stock/mouvements/chart_by_product/ ──────────────────────────────────────────────

    def test_chart_by_product_n_affiche_pas_un_produit_dont_le_seul_flux_a_ete_annule(self):
        self._scenario()
        data = self._data("mouvement-stock-chart-by-product")
        self.assertEqual([row["product"] for row in data], ["Riz 25kg"])
        self.assertEqual((data[0]["inbound"], data[0]["outbound"]), (10, 3))

    def test_chart_by_product_garde_les_flux_reels_d_un_produit_qui_a_aussi_une_annulation(self):
        self._scenario()
        self._mvt(self.sucre, "OUT", 2)
        data = {row["product"]: row for row in self._data("mouvement-stock-chart-by-product")}
        self.assertEqual((data["Sucre 1kg"]["inbound"], data["Sucre 1kg"]["outbound"]), (0, 2))

    # ── Annulation manuelle (action `annuler`) ───────────────────────────────────────────

    def test_une_annulation_manuelle_disparait_aussi_des_statistiques(self):
        mvt = self._mvt(self.riz, "IN", 7)
        self.assertEqual(self._data("mouvement-stock-stats")["entrees"], 1)

        response = self.client.post(reverse("mouvement-stock-annuler", kwargs={"pk": mvt.pk}))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._data("mouvement-stock-stats")["total"], 0)
        self.assertEqual(self._data("mouvement-stock-chart", range="day"), [])
        self.riz.refresh_from_db()
        self.assertEqual(self.riz.current_stock, 100)

    def test_la_liste_des_mouvements_conserve_tout_l_historique(self):
        """Les statistiques excluent les annulations ; la liste, elle, les montre toutes."""
        self._scenario()
        response = self.client.get(reverse("mouvement-stock-list"))
        self.assertEqual(response.status_code, 200)
        rows = response.data["data"] if isinstance(response.data, dict) and "data" in response.data else response.data
        if isinstance(rows, dict) and "results" in rows:
            rows = rows["results"]
        self.assertEqual(len(rows), 4)
