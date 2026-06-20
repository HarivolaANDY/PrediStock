from django.urls import reverse
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token

from apps.accounts.models import User
from apps.catalogue.models import Product, Category, Supplier
from .models import BonCommande, ContenuDans, DonneeVente, ProduitDonneeVente, Remboursement


# ─── Helpers ────────────────────────────────────────────────
def create_user(email="cmd@predistock.com", password="Pass123", username="cmduser"):
    return User.objects.create_user(
        username=username, email=email, password=password,
        first_name="Cmd", last_name="User",
    )

def get_token(user):
    token, _ = Token.objects.get_or_create(user=user)
    return token.key

def auth_client(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {get_token(user)}")
    client.enforce_csrf_checks = False
    return client

def anon_client():
    client = APIClient()
    client.enforce_csrf_checks = False
    return client

def create_category():
    return Category.objects.create(name="Épicerie Test")

def create_supplier():
    return Supplier.objects.create(name="Fournisseur Test")

def create_product(name="Produit Test", stock=100):
    return Product.objects.create(
        name=name, sku=f"SKU-{name[:3].upper()}",
        price=1000, current_stock=stock,
        stock_threshold=10,
    )

def create_bon_commande(user, supplier=None):
    return BonCommande.objects.create(
        utilisateur=user,
        fournisseur=supplier,
        numero_commande="BC-001",
        status=BonCommande.Status.EN_ATTENTE,
        montant_total=50000,
    )

def create_donnee_vente(user, prix=1000, qte=10):
    return DonneeVente.objects.create(
        utilisateur=user,
        quantite_vendu=qte,
        prix_unitaire=prix,
        montant_total=prix * qte,
        canal_vente="Direct",
        segment_clientele="Particulier",
    )


# ════════════════════════════════════════════════════════════
#  BON DE COMMANDE
# ════════════════════════════════════════════════════════════

class BonCommandeListTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.url = reverse('bon-commande-list')
        self.supplier = create_supplier()
        create_bon_commande(self.user, self.supplier)

    def test_list_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_unauthenticated_returns_401(self):
        response = anon_client().get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_contains_commande(self):
        response = self.client.get(self.url)
        self.assertGreaterEqual(len(response.data), 1)

    def test_filter_by_status(self):
        response = self.client.get(self.url + '?status=En attente')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filter_by_numero_commande(self):
        response = self.client.get(self.url + '?numero_commande=BC-001')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class BonCommandeCreateTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.url = reverse('bon-commande-list')
        self.supplier = create_supplier()

    def test_create_success(self):
        response = self.client.post(self.url, {
            "numero_commande": "BC-TEST-001",
            "status": "En attente",
            "montant_total": 75000,
            "fournisseur": self.supplier.pk,
            "utilisateur": self.user.pk,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(BonCommande.objects.filter(numero_commande="BC-TEST-001").exists())

    def test_create_without_fournisseur(self):
        response = self.client.post(self.url, {
            "numero_commande": "BC-SANS-FOURN",
            "montant_total": 10000,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_unauthenticated_returns_401(self):
        response = anon_client().post(self.url, {
            "numero_commande": "BC-ANON",
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class BonCommandeRetrieveUpdateDeleteTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.bc = create_bon_commande(self.user)
        self.url = reverse('bon-commande-detail', kwargs={'pk': self.bc.pk})

    def test_retrieve_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_correct_numero(self):
        response = self.client.get(self.url)
        self.assertEqual(response.data['numero_commande'], "BC-001")

    def test_retrieve_nonexistent_returns_404(self):
        url = reverse('bon-commande-detail', kwargs={'pk': 99999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_status(self):
        response = self.client.patch(self.url, {
            "status": "Confirmé"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.bc.refresh_from_db()
        self.assertEqual(self.bc.status, "Confirmé")

    def test_delete_success(self):
        response = self.client.delete(self.url)
        self.assertIn(response.status_code, [
            status.HTTP_200_OK, status.HTTP_204_NO_CONTENT
        ])
        self.assertFalse(BonCommande.objects.filter(pk=self.bc.pk).exists())


# ════════════════════════════════════════════════════════════
#  DONNÉE DE VENTE
# ════════════════════════════════════════════════════════════

class DonneeVenteListTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.url = reverse('donnee-vente-list')
        create_donnee_vente(self.user)
        create_donnee_vente(self.user, prix=2000, qte=5)

    def test_list_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_unauthenticated_returns_401(self):
        response = anon_client().get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_contains_two_ventes(self):
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 2)

    def test_filter_by_canal_vente(self):
        response = self.client.get(self.url + '?canal_vente=Direct')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filter_by_quantite_gt(self):
        response = self.client.get(self.url + '?quantite_vendu__gt=7')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class DonneeVenteCreateTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.url = reverse('donnee-vente-list')
        self.product = create_product()

    def test_create_success(self):
        response = self.client.post(self.url, {
            "quantite_vendu": 20,
            "prix_unitaire": "1500.00",
            "montant_total": "30000.00",
            "canal_vente": "En ligne",
            "segment_clientele": "Professionnel",
            "utilisateur": self.user.pk,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_with_produit_creates_liaison(self):
        response = self.client.post(self.url, {
            "quantite_vendu": 5,
            "prix_unitaire": "500.00",
            "montant_total": "2500.00",
            "utilisateur": self.user.pk,
            "id_produit": self.product.pk,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ProduitDonneeVente.objects.filter(produit=self.product).exists())

    def test_create_missing_required_fields(self):
        response = self.client.post(self.url, {
            "canal_vente": "Test",
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_unauthenticated_returns_401(self):
        response = anon_client().post(self.url, {
            "quantite_vendu": 1,
            "prix_unitaire": "100.00",
            "montant_total": "100.00",
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DonneeVenteActionsTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.url = reverse('donnee-vente-list')
        create_donnee_vente(self.user)
        create_donnee_vente(self.user, prix=3000, qte=2)

    def test_bulk_delete(self):
        url = reverse('donnee-vente-bulk-delete')
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(DonneeVente.objects.count(), 0)

    def test_retrieve_returns_200(self):
        dv = DonneeVente.objects.first()
        url = reverse('donnee-vente-detail', kwargs={'pk': dv.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_canal_vente(self):
        dv = DonneeVente.objects.first()
        url = reverse('donnee-vente-detail', kwargs={'pk': dv.pk})
        response = self.client.patch(url, {"canal_vente": "Marché"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_single(self):
        dv = DonneeVente.objects.first()
        url = reverse('donnee-vente-detail', kwargs={'pk': dv.pk})
        response = self.client.delete(url)
        self.assertIn(response.status_code, [
            status.HTTP_200_OK, status.HTTP_204_NO_CONTENT
        ])


# ════════════════════════════════════════════════════════════
#  REMBOURSEMENT
# ════════════════════════════════════════════════════════════

class RemboursementTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.url = reverse('remboursement-list')
        self.product = create_product("Produit Remboursé")
        self.remboursement = Remboursement.objects.create(
            source_type='Vente',
            numero_transaction="V-TEST-001",
            produit=self.product,
            quantite=5,
            montant=5000,
            raison="Défaut qualité",
        )

    def test_list_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_unauthenticated_returns_401(self):
        response = anon_client().get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_remboursement(self):
        response = self.client.post(self.url, {
            "source_type": "Vente",
            "numero_transaction": "V-TEST-002",
            "produit": self.product.pk,
            "quantite": 2,
            "montant": 2000,
            "raison": "Produit endommagé",
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_retrieve_remboursement(self):
        url = reverse('remboursement-detail', kwargs={'pk': self.remboursement.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_remboursement(self):
        url = reverse('remboursement-detail', kwargs={'pk': self.remboursement.pk})
        response = self.client.patch(url, {
            "raison": "Autre raison"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.remboursement.refresh_from_db()
        self.assertEqual(self.remboursement.raison, "Autre raison")

    def test_delete_remboursement(self):
        url = reverse('remboursement-detail', kwargs={'pk': self.remboursement.pk})
        response = self.client.delete(url)
        self.assertIn(response.status_code, [
            status.HTTP_200_OK, status.HTTP_204_NO_CONTENT
        ])
        self.assertFalse(Remboursement.objects.filter(pk=self.remboursement.pk).exists())


# ════════════════════════════════════════════════════════════
#  CONTENU DANS
# ════════════════════════════════════════════════════════════

class ContenuDansTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.url = reverse('contenu-dans-list')
        self.product = create_product("Produit Contenu")

    def test_list_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_contenu_sans_recommandation(self):
        response = self.client.post(self.url, {
            "produit": self.product.pk,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_list_unauthenticated_returns_401(self):
        response = anon_client().get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ════════════════════════════════════════════════════════════
#  PRODUIT DONNÉE VENTE
# ════════════════════════════════════════════════════════════

class ProduitDonneeVenteTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.url = reverse('produit-donnee-vente-list')
        self.product = create_product("Produit DV")
        self.dv = create_donnee_vente(self.user)
        self.liaison = ProduitDonneeVente.objects.create(
            produit=self.product,
            donnee_vente=self.dv,
        )

    def test_list_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_liaison(self):
        product2 = create_product("Produit DV 2")
        dv2 = create_donnee_vente(self.user, prix=2000, qte=3)
        response = self.client.post(self.url, {
            "produit": product2.pk,
            "donnee_vente": dv2.pk,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_unique_together_constraint(self):
        response = self.client.post(self.url, {
            "produit": self.product.pk,
            "donnee_vente": self.dv.pk,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_str_liaison(self):
        self.assertIn("Produit DV", str(self.liaison))

    def test_delete_liaison(self):
        url = reverse('produit-donnee-vente-detail', kwargs={'pk': self.liaison.pk})
        response = self.client.delete(url)
        self.assertIn(response.status_code, [
            status.HTTP_200_OK, status.HTTP_204_NO_CONTENT
        ])
        self.assertFalse(ProduitDonneeVente.objects.filter(pk=self.liaison.pk).exists())


# ════════════════════════════════════════════════════════════
#  MODÈLES
# ════════════════════════════════════════════════════════════

class CommandeModelTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.supplier = create_supplier()

    def test_str_bon_commande(self):
        bc = create_bon_commande(self.user, self.supplier)
        self.assertIn("BC-001", str(bc))

    def test_str_donnee_vente(self):
        dv = create_donnee_vente(self.user)
        self.assertIn("Vente", str(dv))

    def test_bon_commande_default_status(self):
        bc = BonCommande.objects.create(utilisateur=self.user)
        self.assertEqual(bc.status, BonCommande.Status.EN_ATTENTE)

    def test_donnee_vente_montant_calcul(self):
        dv = create_donnee_vente(self.user, prix=2000, qte=5)
        self.assertEqual(float(dv.montant_total), 10000.0)