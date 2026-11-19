"""
Insère un jeu de données de démonstration cohérent (catalogue + achats + ventes + remboursements)
pour la capture vidéo, sans rien saisir à la main.

    python manage.py demo_seed                      # sauvegarde la base, puis insère le scénario
    python manage.py demo_seed --utilisateur admin  # compte auteur des documents (défaut : 1er superutilisateur)
    python manage.py demo_seed --nom-sauvegarde x   # nom de la sauvegarde automatique

Comment ça marche
  • Le scénario passe par l'API réelle (mêmes serializers, mêmes signaux) : les stocks, mouvements,
    lots, historiques de paiement et remboursements sont produits par le vrai code, pas simulés.
  • Tout est fait dans UNE transaction : si une étape échoue, rien n'est inséré.
  • Une sauvegarde « avant-seed-<date> » est créée AVANT toute écriture (dossier backend/sauvegardes/).
    Pour recommencer une prise : `python manage.py demo_reset restaurer avant-seed-<date>`.
  • Les données existantes ne sont ni modifiées ni supprimées ; le script refuse de s'exécuter
    deux fois (il détecte les produits de démonstration).
  • Les dates des documents sont étalées sur ~4 semaines pour que les graphiques de l'écran Analyse
    et la page Transactions soient parlants.
"""
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.test.utils import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.catalogue.models import Category, Product, ProduitDv, Supplier
from apps.commandes.models import BonCommande, DonneeVente, Remboursement, TransactionPaiement
from apps.stock.models import MouvementStock

from .demo_reset import EXTENSION, base_saine, copier_base

# ── Catalogue de démonstration ───────────────────────────────────────────────────────────────
CATEGORIES = ["Épicerie", "Boissons", "Hygiène et entretien"]

FOURNISSEURS = {
    "Grossiste Tana Épicerie": {"email": "contact@tana-epicerie.example", "phone": "034 00 000 01", "lead_time": 3},
    "Boissons de l'Océan": {"email": "commandes@boissons-ocean.example", "phone": "034 00 000 02", "lead_time": 2},
    "Hygiène Plus Mada": {"email": "ventes@hygiene-plus.example", "phone": "034 00 000 03", "lead_time": 5},
}

# nom → (catégorie, fournisseur, prix de vente, seuil d'alerte, unité, périssable)
PRODUITS = {
    "Riz Vary Gasy 25 kg": ("Épicerie", "Grossiste Tana Épicerie", 95000, 10, "Sac", False),
    "Huile végétale 1 L": ("Épicerie", "Grossiste Tana Épicerie", 8500, 20, "Bouteille", False),
    "Sucre blanc 1 kg": ("Épicerie", "Grossiste Tana Épicerie", 4500, 30, "Kg", False),
    "Eau minérale 1,5 L (pack)": ("Boissons", "Boissons de l'Océan", 12000, 15, "Pack", False),
    "Jus d'orange 1 L": ("Boissons", "Boissons de l'Océan", 6500, 15, "Bouteille", True),
    "Savon de ménage": ("Hygiène et entretien", "Hygiène Plus Mada", 2500, 30, "Pièce", False),
    "Lessive en poudre 1 kg": ("Hygiène et entretien", "Hygiène Plus Mada", 7500, 10, "Paquet", False),
}
VARIANTES_SAVON = ["Pain 200 g", "Pain 400 g"]

# Stock d'ouverture (inventaire initial, 30 jours avant) : le magasin ne démarre pas à vide, ce qui
# garde des achats raisonnables face aux ventes (donc une marge lisible dans l'écran Analyse).
# clé : nom du produit, ou (nom, désignation de variante) → quantité
OUVERTURE = {
    "Riz Vary Gasy 25 kg": 20, "Huile végétale 1 L": 60, "Sucre blanc 1 kg": 120,
    "Eau minérale 1,5 L (pack)": 30, "Jus d'orange 1 L": 40, "Lessive en poudre 1 kg": 8,
    ("Savon de ménage", "Pain 200 g"): 100, ("Savon de ménage", "Pain 400 g"): 60,
}
JOURS_OUVERTURE = 30


class Command(BaseCommand):
    help = "Insère un jeu de données de démonstration (achats, ventes, remboursements) après sauvegarde de la base."

    def add_arguments(self, parser):
        parser.add_argument("--utilisateur", help="Nom d'utilisateur auteur des documents (défaut : 1er superutilisateur)")
        parser.add_argument("--nom-sauvegarde", help="Nom de la sauvegarde automatique (défaut : avant-seed-<date>)")
        parser.add_argument("--sans-sauvegarde", action="store_true",
                            help="N'effectue pas la sauvegarde automatique (réservé aux tests ; déconseillé)")

    # ── Point d'entrée ───────────────────────────────────────────────────────────────────
    def handle(self, *args, **options):
        utilisateur = self._utilisateur(options["utilisateur"])
        if Product.objects.filter(name__in=PRODUITS).exists():
            raise CommandError(
                "Les données de démonstration sont déjà présentes (produits du scénario trouvés). "
                "Pour recommencer : python manage.py demo_reset restaurer <sauvegarde avant-seed-…>."
            )
        if not options["sans_sauvegarde"]:
            self._sauvegarder(options["nom_sauvegarde"])

        # ALLOWED_HOSTS : le client interne s'appelle « testserver », absent de la configuration.
        with override_settings(ALLOWED_HOSTS=["*"]), transaction.atomic():
            self.client = APIClient()
            self.client.force_authenticate(user=utilisateur)
            self.utilisateur = utilisateur
            self._semer()

        self._resume()

    # ── Préparation ──────────────────────────────────────────────────────────────────────
    def _utilisateur(self, username):
        if username:
            user = User.objects.filter(username=username).first()
            if user is None:
                raise CommandError(f"Utilisateur « {username} » introuvable.")
            return user
        user = User.objects.filter(is_superuser=True).order_by("id").first()
        if user is None:
            raise CommandError("Aucun superutilisateur : créez-en un (createsuperuser) ou précisez --utilisateur.")
        return user

    def _sauvegarder(self, nom):
        config = settings.DATABASES["default"]
        base = str(config["NAME"])
        if not config["ENGINE"].endswith("sqlite3") or base == ":memory:" or base.startswith("file:"):
            raise CommandError("La sauvegarde automatique ne gère qu'une base SQLite stockée dans un fichier.")
        nom = nom or f"avant-seed-{timezone.localtime():%Y%m%d-%H%M%S}"
        chemin = Path(settings.BASE_DIR) / "sauvegardes" / f"{nom}{EXTENSION}"
        if chemin.exists():
            raise CommandError(f"La sauvegarde « {nom} » existe déjà : choisissez un autre nom.")
        chemin.parent.mkdir(parents=True, exist_ok=True)
        copier_base(base, chemin)
        if not base_saine(chemin):
            chemin.unlink()
            raise CommandError("La sauvegarde a échoué au contrôle d'intégrité : rien n'a été inséré.")
        self.stdout.write(self.style.SUCCESS(f"Sauvegarde « {nom} » créée avant insertion : {chemin}"))

    # ── Aides API ────────────────────────────────────────────────────────────────────────
    def _appel(self, methode, url, donnees=None):
        reponse = getattr(self.client, methode)(url, donnees, format="json")
        if reponse.status_code >= 400:
            raise CommandError(f"Le scénario a échoué ({methode.upper()} {url} → {reponse.status_code}) : {reponse.data}")
        return reponse.data

    def _creer_achat(self, fournisseur, lignes, **extra):
        return self._appel("post", reverse("bon-commande-list"), {
            "fournisseur": fournisseur.pk, "utilisateur": self.utilisateur.pk,
            "lignes_data": lignes, **extra,
        })

    def _creer_vente(self, segment, lignes, **extra):
        return self._appel("post", reverse("donnee-vente-list"), {
            "utilisateur": self.utilisateur.pk, "segment_clientele": segment,
            "lignes_data": lignes, **extra,
        })

    def _statut(self, nom, pk, statut, **extra):
        return self._appel("patch", reverse(f"{nom}-detail", kwargs={"pk": pk}), {"status": statut, **extra})

    def _payer(self, nom, pk, montant, mode, notes=""):
        return self._appel("post", reverse(f"{nom}-payer", kwargs={"pk": pk}),
                           {"montant": montant, "mode_paiement": mode, "notes": notes})

    def _livrer_achat(self, pk):
        return self._statut("bon-commande", pk, "Livré", livraison_actuelle=timezone.now().isoformat())

    def _antidater(self, achat=None, vente=None, jours=0):
        """
        Recule d'un nombre de jours TOUTES les dates du document (création, livraison, paiements,
        mouvements de stock, remboursements). update() ne déclenche aucun signal.
        """
        moment = timezone.now() - timedelta(days=jours)
        if achat is not None:
            BonCommande.objects.filter(pk=achat).update(date_commande=moment, creer_le=moment)
            BonCommande.objects.filter(pk=achat, status="Livré").update(livraison_actuelle=moment)
            TransactionPaiement.objects.filter(bon_commande_id=achat).update(date_paiement=moment)
            refs = [f"BC-LINE-{pk}" for pk in
                    BonCommande.objects.get(pk=achat).lignes.values_list("id", flat=True)]
            type_source, source = Remboursement.TypeSource.ACHAT, achat
        else:
            DonneeVente.objects.filter(pk=vente).update(date_vente=moment, creer_le=moment)
            TransactionPaiement.objects.filter(donnee_vente_id=vente).update(date_paiement=moment)
            refs = [f"SALE-{vente}-{pk}" for pk in
                    DonneeVente.objects.get(pk=vente).lignes.values_list("id", flat=True)]
            type_source, source = Remboursement.TypeSource.VENTE, vente
        MouvementStock.objects.filter(referrence__in=refs).update(timestamp=moment)
        Remboursement.objects.filter(source_type=type_source, source_id=source).update(date_remboursement=moment)

    def _stock_d_ouverture(self, produits, variantes):
        """Entrées « Stock d'ouverture » datées de JOURS_OUVERTURE jours (même chemin que tout mouvement : signaux)."""
        moment = timezone.now() - timedelta(days=JOURS_OUVERTURE)
        for cle, quantite in OUVERTURE.items():
            nom, designation = cle if isinstance(cle, tuple) else (cle, None)
            produit = produits[nom]
            variante = variantes[designation] if designation else None
            mouvement = MouvementStock.objects.create(
                produit=produit, produit_dv=variante, utilisateur=self.utilisateur,
                quantity=quantite, movement_type=MouvementStock.TypeMouvement.IN,
                unit_price=round(float(produit.price) * 0.85),
                reason="Stock d'ouverture (inventaire initial)",
                referrence=f"INIT-{produit.pk}" + (f"-{variante.pk}" if variante else ""),
            )
            MouvementStock.objects.filter(pk=mouvement.pk).update(timestamp=moment)

    # ── Scénario ─────────────────────────────────────────────────────────────────────────
    def _semer(self):
        categories = {nom: Category.objects.get_or_create(name=nom)[0] for nom in CATEGORIES}
        fournisseurs = {}
        for nom, infos in FOURNISSEURS.items():
            fournisseurs[nom] = Supplier.objects.get_or_create(name=nom, defaults=infos)[0]

        produits = {}
        for nom, (categorie, fournisseur, prix, seuil, unite, perissable) in PRODUITS.items():
            produits[nom] = Product.objects.create(
                name=nom, sku=f"DEMO-{len(produits) + 1:03d}", price=prix, stock_threshold=seuil,
                current_stock=0, category=categories[categorie], supplier=fournisseurs[fournisseur],
                unite_mesure=unite, est_perissable=perissable,
            )
            fournisseurs[fournisseur].products.add(produits[nom])

        riz, huile, sucre = (produits[n] for n in ("Riz Vary Gasy 25 kg", "Huile végétale 1 L", "Sucre blanc 1 kg"))
        eau, jus = produits["Eau minérale 1,5 L (pack)"], produits["Jus d'orange 1 L"]
        savon, lessive = produits["Savon de ménage"], produits["Lessive en poudre 1 kg"]
        savon_200, savon_400 = (
            ProduitDv.objects.create(product=savon, designation=d, nombre=0) for d in VARIANTES_SAVON
        )
        tana, ocean, hygiene = (fournisseurs[n] for n in FOURNISSEURS)

        def ligne(produit, quantite, prix, variante=None, remise=0):
            donnees = {"produit": produit.pk, "quantite": quantite, "prix_unitaire": prix}
            if variante is not None:
                donnees["produit_dv"] = variante.pk
            if remise:
                donnees["remise_applique"] = remise
            return donnees

        self._stock_d_ouverture(produits, {d.designation: d for d in (savon_200, savon_400)})

        # ═══ ACHATS (réapprovisionnements) ════════════════════════════════════════════════
        # A1 — livré, payé en deux versements (virement puis espèces) : 766 000 Ar
        a1 = self._creer_achat(tana, [ligne(riz, 4, 82000), ligne(huile, 30, 7000), ligne(sucre, 60, 3800)])
        self._livrer_achat(a1["id"])
        self._payer("bon-commande", a1["id"], 500000, "Virement", "Acompte à la commande")
        self._payer("bon-commande", a1["id"], 266000, "Espèces", "Solde à la livraison")
        self._antidater(achat=a1["id"], jours=28)

        # A2 — livré, paiement partiel par mobile money : 199 000 Ar dont 120 000 versés
        a2 = self._creer_achat(ocean, [ligne(eau, 10, 9500), ligne(jus, 20, 5200)])
        self._livrer_achat(a2["id"])
        self._payer("bon-commande", a2["id"], 120000, "Orange Money", "Premier versement")
        self._antidater(achat=a2["id"], jours=21)

        # A3 — livré (variantes + produit simple), payé comptant : 156 800 Ar
        a3 = self._creer_achat(hygiene, [
            ligne(savon, 40, 1600, savon_200), ligne(savon, 20, 2900, savon_400), ligne(lessive, 6, 5800),
        ])
        self._livrer_achat(a3["id"])
        self._payer("bon-commande", a3["id"], 64000 + 58000 + 34800, "Espèces")
        self._antidater(achat=a3["id"], jours=14)

        # A4 — livré et payé, puis ANNULÉ : mouvement inverse + remboursement à encaisser
        a4 = self._creer_achat(tana, [ligne(riz, 3, 82000)])
        self._livrer_achat(a4["id"])
        self._payer("bon-commande", a4["id"], 246000, "Virement")
        self._statut("bon-commande", a4["id"], "Annulé")
        self._antidater(achat=a4["id"], jours=10)

        # A5 — en attente de livraison
        a5 = self._creer_achat(ocean, [ligne(jus, 30, 5200)],
                               livraison_prevue=(timezone.now() + timedelta(days=2)).isoformat())
        self._antidater(achat=a5["id"], jours=4)

        # A6 — annulé avant toute livraison ni paiement (ne laisse aucun mouvement)
        a6 = self._creer_achat(tana, [ligne(sucre, 50, 3800)])
        self._statut("bon-commande", a6["id"], "Annulé")
        self._antidater(achat=a6["id"], jours=3)

        # ═══ VENTES ═══════════════════════════════════════════════════════════════════════
        # V1 — comptant, livrée et payée
        v1 = self._creer_vente("Particulier", [ligne(riz, 2, 95000), ligne(huile, 4, 8500)])
        self._statut("donnee-vente", v1["id"], "Livré")
        self._payer("donnee-vente", v1["id"], 224000, "Espèces")
        self._antidater(vente=v1["id"], jours=20)

        # V2 — professionnel, remise sur le riz, paiement partiel
        v2 = self._creer_vente("Professionnel", [
            ligne(riz, 8, 95000, remise=30000), ligne(sucre, 40, 4500), ligne(eau, 12, 12000),
        ], mode_paiement="Orange Money")
        self._statut("donnee-vente", v2["id"], "Livré")
        self._payer("donnee-vente", v2["id"], 700000, "Orange Money", "Acompte")
        self._antidater(vente=v2["id"], jours=15)

        # V3 — produit à variante + lessive (fait passer la lessive sous son seuil d'alerte)
        v3 = self._creer_vente("Particulier", [ligne(savon, 30, 2500, savon_200), ligne(lessive, 5, 7500)])
        self._statut("donnee-vente", v3["id"], "Livré")
        self._payer("donnee-vente", v3["id"], 112500, "YAS")
        self._antidater(vente=v3["id"], jours=12)

        # V4 — vente À CRÉDIT (client VIP/Fidélisé), délai futur, acompte versé
        v4 = self._creer_vente("VIP/Fidélisé", [ligne(huile, 30, 8500), ligne(jus, 25, 6500)],
                               type_vente="Crédit",
                               delai_paiement=(timezone.now() + timedelta(days=20)).isoformat())
        self._statut("donnee-vente", v4["id"], "Livré")
        self._payer("donnee-vente", v4["id"], 150000, "Airtel Money", "Acompte crédit")
        self._antidater(vente=v4["id"], jours=8)

        # V5 — livrée, payée, puis ANNULÉE : stock restitué + remboursement client, réglé ensuite
        v5 = self._creer_vente("Particulier", [ligne(eau, 5, 12000)])
        self._statut("donnee-vente", v5["id"], "Livré")
        self._payer("donnee-vente", v5["id"], 60000, "YAS")
        self._statut("donnee-vente", v5["id"], "Annulé")
        self._antidater(vente=v5["id"], jours=6)
        rembourse = Remboursement.objects.get(source_type=Remboursement.TypeSource.VENTE, source_id=v5["id"])
        self._appel("patch", reverse("remboursement-detail", kwargs={"pk": rembourse.pk}),
                    {"statut_reglement": "Réglé"})

        # V6 — en attente (aucun mouvement de stock)
        v6 = self._creer_vente("Particulier", [ligne(jus, 10, 6500)])
        self._antidater(vente=v6["id"], jours=2)

        # V7 — livrée, pas encore payée
        v7 = self._creer_vente("Professionnel", [ligne(sucre, 20, 4500)])
        self._statut("donnee-vente", v7["id"], "Livré")
        self._antidater(vente=v7["id"], jours=1)

        # Retour client saisi à la main (type « Retour »)
        self._appel("post", reverse("remboursement-list"), {
            "source_type": "Retour", "source_id": v1["id"], "numero_transaction": v1["numero_vente"],
            "produit": huile.pk, "quantite": 2, "montant": 17000,
            "raison": "Bouteilles reçues endommagées", "statut_reglement": "Non réglé",
        })

    # ── Compte rendu ─────────────────────────────────────────────────────────────────────
    def _resume(self):
        self.stdout.write(self.style.SUCCESS("Données de démonstration insérées."))
        self.stdout.write(
            f"  {BonCommande.objects.count()} achats au total · "
            f"{DonneeVente.objects.count()} ventes · {Remboursement.objects.count()} remboursements · "
            f"{TransactionPaiement.objects.count()} lignes de paiement · "
            f"{MouvementStock.objects.count()} mouvements de stock"
        )
        self.stdout.write("  Stock des produits de démonstration :")
        for produit in Product.objects.filter(name__in=PRODUITS).order_by("name"):
            alerte = "  ⚠ sous le seuil" if Decimal(str(produit.current_stock)) < produit.stock_threshold else ""
            self.stdout.write(f"    {produit.name:<30} {produit.current_stock:>8} (seuil {produit.stock_threshold}){alerte}")
