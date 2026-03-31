from django.urls import reverse
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from apps.accounts.models import User
from .models import Category, Supplier, Product, ProductBatch, ProduitDv


# ─── Helpers ────────────────────────────────────────────────

def create_user(email="cat@predistock.com", password="Pass123", username="catuser", role="Utilisateur"):
    return User.objects.create_user(
        username=username, email=email, password=password,
        first_name="Cat", last_name="User", role=role,
    )

def create_admin():
    return create_user(
        email="admin@predistock.com", password="Admin123",
        username="admincat", role="Administrateur"
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

def create_category(name="Épicerie", description="Produits épicerie", is_active=True):
    return Category.objects.create(name=name, description=description, is_active=is_active)

def create_supplier(name="FournisseurTest"):
    return Supplier.objects.create(
        name=name, email="fournisseur@test.com",
        phone="0340000001", lead_time=3,
        min_order_quantity=10, max_order_quantity=500,
    )

def create_product(name="Riz", category=None, supplier=None, stock=100, threshold=10):
    return Product.objects.create(
        name=name, sku=f"SKU-{name[:3].upper()}",
        price=5000, current_stock=stock,
        stock_threshold=threshold,
        category=category, supplier=supplier,
        unite_mesure="Kg",
    )


# ════════════════════════════════════════════════════════════
#  CATEGORY
# ════════════════════════════════════════════════════════════

class CategoryListTests(TestCase):
    """GET /api/catalogue/categories/ — AllowAny"""

    def setUp(self):
        self.url = reverse('category-list')
        self.client = anon_client()
        create_category("Boissons")
        create_category("Légumes", is_active=False)

    def test_list_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_contains_all_categories(self):
        response = self.client.get(self.url)
        self.assertEqual(len(response.data['data']), 2)

    def test_list_unauthenticated_allowed(self):
        response = anon_client().get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_filter_by_is_active(self):
        response = self.client.get(self.url + '?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for item in response.data['data']:
            self.assertTrue(item['is_active'])

    def test_list_filter_by_name(self):
        response = self.client.get(self.url + '?name=Boissons')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_structure_has_success_and_data(self):
        response = self.client.get(self.url)
        self.assertIn('success', response.data)
        self.assertIn('data', response.data)
        self.assertTrue(response.data['success'])


class CategoryCreateTests(TestCase):
    """POST /api/catalogue/categories/"""

    def setUp(self):
        self.url = reverse('category-list')
        self.user = create_user()
        self.client = auth_client(self.user)

    def test_create_success(self):
        response = self.client.post(self.url, {
            "name": "Nouvelle Catégorie",
            "description": "Description test",
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Category.objects.filter(name="Nouvelle Catégorie").exists())

    def test_create_without_description(self):
        response = self.client.post(self.url, {"name": "Sans description"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_duplicate_name_fails(self):
        create_category("Doublon")
        response = self.client.post(self.url, {"name": "Doublon"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_duplicate_name_case_insensitive(self):
        create_category("épicerie")
        response = self.client.post(self.url, {"name": "ÉPICERIE"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_missing_name_fails(self):
        response = self.client.post(self.url, {"description": "sans nom"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_empty_name_fails(self):
        response = self.client.post(self.url, {"name": "   "}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_unauthenticated_allowed(self):
        response = anon_client().post(self.url, {"name": "Anon Catégorie"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class CategoryRetrieveTests(TestCase):
    """GET /api/catalogue/categories/{id}/"""

    def setUp(self):
        self.cat = create_category("Fruits")
        self.url = reverse('category-detail', kwargs={'pk': self.cat.pk})

    def test_retrieve_returns_200(self):
        response = anon_client().get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_correct_data(self):
        response = anon_client().get(self.url)
        self.assertEqual(response.data['data']['name'], "Fruits")

    def test_retrieve_nonexistent_returns_404(self):
        url = reverse('category-detail', kwargs={'pk': 99999})
        response = anon_client().get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CategoryUpdateTests(TestCase):
    """PUT/PATCH /api/catalogue/categories/{id}/"""

    def setUp(self):
        self.cat = create_category("Viandes")
        self.url = reverse('category-detail', kwargs={'pk': self.cat.pk})
        self.user = create_user()
        self.client = auth_client(self.user)

    def test_update_success(self):
        response = self.client.put(self.url, {
            "name": "Viandes & Charcuterie",
            "is_active": True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.cat.refresh_from_db()
        self.assertEqual(self.cat.name, "Viandes & Charcuterie")

    def test_partial_update_success(self):
        response = self.client.patch(self.url, {"is_active": False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.cat.refresh_from_db()
        self.assertFalse(self.cat.is_active)

    def test_update_duplicate_name_fails(self):
        create_category("Poissons")
        response = self.client.put(self.url, {"name": "Poissons"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_nonexistent_returns_404(self):
        url = reverse('category-detail', kwargs={'pk': 99999})
        response = self.client.put(url, {"name": "Fantôme"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CategoryDeleteTests(TestCase):
    """DELETE /api/catalogue/categories/{id}/"""

    def setUp(self):
        self.cat = create_category("À Supprimer")
        self.url = reverse('category-detail', kwargs={'pk': self.cat.pk})
        self.user = create_user()
        self.client = auth_client(self.user)

    def test_delete_success(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Category.objects.filter(pk=self.cat.pk).exists())

    def test_delete_nonexistent_returns_404(self):
        url = reverse('category-detail', kwargs={'pk': 99999})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CategoryActionsTests(TestCase):
    """Actions custom : /search/, /active/, /toggle_active/"""

    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.cat_active   = create_category("Actif",   is_active=True)
        self.cat_inactive = create_category("Inactif", is_active=False)

    def test_search_returns_matching(self):
        url = reverse('category-search')
        response = self.client.get(url + '?q=Actif')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 1)

    def test_search_empty_query_returns_all(self):
        url = reverse('category-search')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_active_returns_only_active(self):
        url = reverse('category-active')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for item in response.data['data']:
            self.assertTrue(item['is_active'])

    def test_toggle_active_switches_status(self):
        url = reverse('category-toggle-active', kwargs={'pk': self.cat_active.pk})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.cat_active.refresh_from_db()
        self.assertFalse(self.cat_active.is_active)

    def test_toggle_active_nonexistent_returns_404(self):
        url = reverse('category-toggle-active', kwargs={'pk': 99999})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ════════════════════════════════════════════════════════════
#  SUPPLIER
# ════════════════════════════════════════════════════════════

class SupplierTests(TestCase):
    """CRUD Fournisseurs — IsAuthenticated"""

    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.list_url = reverse('supplier-list')
        self.supplier = create_supplier()

    def test_list_returns_200(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_unauthenticated_returns_401(self):
        response = anon_client().get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_supplier(self):
        response = self.client.post(self.list_url, {
            "name": "Nouveau Fournisseur",
            "email": "nouveau@fournisseur.com",
            "phone": "0340000099",
            "lead_time": 5,
            "min_order_quantity": 20,
            "max_order_quantity": 1000,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Supplier.objects.filter(name="Nouveau Fournisseur").exists())

    def test_create_supplier_minimal(self):
        response = self.client.post(self.list_url, {"name": "Mini Fournisseur"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_supplier_missing_name_fails(self):
        response = self.client.post(self.list_url, {"email": "sans@nom.com"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_supplier(self):
        url = reverse('supplier-detail', kwargs={'pk': self.supplier.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_supplier(self):
        url = reverse('supplier-detail', kwargs={'pk': self.supplier.pk})
        response = self.client.put(url, {
            "name": "Fournisseur Modifié",
            "lead_time": 7,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_supplier(self):
        url = reverse('supplier-detail', kwargs={'pk': self.supplier.pk})
        response = self.client.delete(url)
        self.assertIn(response.status_code, [
            status.HTTP_200_OK, status.HTTP_204_NO_CONTENT
        ])
        self.assertFalse(Supplier.objects.filter(pk=self.supplier.pk).exists())

    def test_retrieve_nonexistent_returns_404(self):
        url = reverse('supplier-detail', kwargs={'pk': 99999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ════════════════════════════════════════════════════════════
#  PRODUCT
# ════════════════════════════════════════════════════════════

class ProductListTests(TestCase):
    """GET /api/catalogue/products/ — IsAuthenticated"""

    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.list_url = reverse('product-list')
        self.cat = create_category("Céréales")
        create_product("Maïs", category=self.cat, stock=200)
        create_product("Blé",  category=self.cat, stock=5, threshold=50)

    def test_list_returns_200(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_unauthenticated_returns_401(self):
        response = anon_client().get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_filter_by_name(self):
        response = self.client.get(self.list_url + '?name=maïs')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_filter_stock_below(self):
        response = self.client.get(self.list_url + '?stock_below=10')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for item in response.data['data']['results']:
            self.assertLessEqual(item['current_stock'], 10)

    def test_list_filter_stock_above(self):
        response = self.client.get(self.list_url + '?stock_above=100')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_filter_is_critical(self):
        response = self.client.get(self.list_url + '?is_critical=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_pagination(self):
        response = self.client.get(self.list_url + '?page=1&page_size=1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data['data'])
        self.assertEqual(len(response.data['data']['results']), 1)

    def test_list_has_total_stock(self):
        response = self.client.get(self.list_url)
        self.assertIn('total_stock', response.data['data'])


class ProductCreateTests(TestCase):
    """POST /api/catalogue/products/"""

    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.list_url = reverse('product-list')
        self.cat = create_category("Légumineuses")
        self.supplier = create_supplier()

    def test_create_success(self):
        response = self.client.post(self.list_url, {
            "name": "Haricots Rouges",
            "sku": "SKU-HAR",
            "price": 3500,
            "current_stock": 50,
            "stock_threshold": 10,
            "category": self.cat.pk,
            "supplier": self.supplier.pk,
            "unite_mesure": "Kg",
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Product.objects.filter(name="Haricots Rouges").exists())

    def test_create_duplicate_name_fails(self):
        create_product("Lentilles")
        response = self.client.post(self.list_url, {
            "name": "Lentilles", "sku": "SKU-LEN",
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_missing_name_fails(self):
        response = self.client.post(self.list_url, {"sku": "SKU-XXX"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_with_perissable_flag(self):
        response = self.client.post(self.list_url, {
            "name": "Yaourt",
            "sku": "SKU-YAO",
            "est_perissable": True,
            "unite_mesure": "Pieces",
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Product.objects.get(name="Yaourt").est_perissable)

    def test_create_unauthenticated_returns_401(self):
        response = anon_client().post(self.list_url, {
            "name": "Anon Produit", "sku": "SKU-ANO",
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_via_post(self):
        create_product("Farine de Maïs")
        response = self.client.post(self.list_url, {"chercher": "Farine"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ProductRetrieveUpdateDeleteTests(TestCase):
    """GET/PUT/PATCH/DELETE /api/catalogue/products/{id}/"""

    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.cat = create_category("Huiles")
        self.product = create_product("Huile de Palme", category=self.cat, stock=80)
        self.url = reverse('product-detail', kwargs={'pk': self.product.pk})

    def test_retrieve_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_correct_name(self):
        response = self.client.get(self.url)
        self.assertEqual(response.data['data']['name'], "Huile de Palme")

    def test_retrieve_nonexistent_returns_404(self):
        url = reverse('product-detail', kwargs={'pk': 99999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_success(self):
        response = self.client.patch(self.url, {"current_stock": 120}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_stock, 120)

    def test_delete_success(self):
        response = self.client.delete(self.url)
        self.assertIn(response.status_code, [
            status.HTTP_200_OK, status.HTTP_204_NO_CONTENT
        ])
        self.assertFalse(Product.objects.filter(pk=self.product.pk).exists())

    def test_unauthenticated_retrieve_returns_401(self):
        response = anon_client().get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProductStatsTests(TestCase):
    """GET /api/catalogue/products/stats/"""

    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.url = reverse('product-stats')
        create_product("Produit A", stock=100)
        create_product("Produit B", stock=0)
        p = create_product("Produit C", stock=50)
        p.est_perissable = True
        p.save()

    def test_stats_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_stats_has_required_fields(self):
        response = self.client.get(self.url)
        data = response.data['data']
        for field in ['total_produits', 'total_stock', 'total_stock_rupture',
                      'total_perissable', 'total_stock_faible']:
            self.assertIn(field, data)

    def test_stats_total_produits_correct(self):
        response = self.client.get(self.url)
        self.assertEqual(response.data['data']['total_produits'], 3)

    def test_stats_rupture_correct(self):
        response = self.client.get(self.url)
        self.assertEqual(response.data['data']['total_stock_rupture'], 1)

    def test_stats_unauthenticated_returns_401(self):
        response = anon_client().get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProductModelTests(TestCase):
    """Tests unitaires sur les properties du modèle Product"""

    def setUp(self):
        self.product = create_product("Sucre", stock=5, threshold=20)

    def test_is_critical_when_stock_below_threshold(self):
        self.assertTrue(self.product.is_critical)

    def test_is_not_critical_when_stock_above_threshold(self):
        self.product.current_stock = 100
        self.assertFalse(self.product.is_critical)

    def test_stock_ratio(self):
        self.assertAlmostEqual(self.product.stock_ratio, 5 / 20)

    def test_stock_ratio_zero_threshold(self):
        self.product.stock_threshold = 0
        self.assertEqual(self.product.stock_ratio, float('inf'))

    def test_get_status_critical(self):
        self.product.current_stock = 1
        self.product.stock_threshold = 20
        self.assertEqual(self.product.get_status(), "critical")

    def test_get_status_good(self):
        self.product.current_stock = 100
        self.product.stock_threshold = 10
        self.assertEqual(self.product.get_status(), "good")

    def test_str_returns_name(self):
        self.assertEqual(str(self.product), "Sucre")


# ════════════════════════════════════════════════════════════
#  PRODUIT DÉRIVÉ (ProduitDv)
# ════════════════════════════════════════════════════════════

class ProduitDvTests(TestCase):
    """CRUD ProduitDv + filtre par produit"""

    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.list_url = reverse('produit-dv-list')
        self.cat = create_category("Transformation")
        self.product = create_product("Manioc", category=self.cat, stock=200)
        self.dv = ProduitDv.objects.create(
            product=self.product,
            designation="Farine de Manioc 1kg",
            quantite=1,
            nombre=50,
        )

    def test_list_returns_200(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_unauthenticated_returns_401(self):
        response = anon_client().get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_produit_dv(self):
        response = self.client.post(self.list_url, {
            "product": self.product.pk,
            "designation": "Tapioca 500g",
            "quantite": 1,
            "nombre": 30,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ProduitDv.objects.filter(designation="Tapioca 500g").exists())

    def test_create_missing_product_fails(self):
        response = self.client.post(self.list_url, {
            "designation": "Sans produit mère",
            "quantite": 1,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_produit_dv(self):
        url = reverse('produit-dv-detail', kwargs={'pk': self.dv.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_produit_dv(self):
        url = reverse('produit-dv-detail', kwargs={'pk': self.dv.pk})
        response = self.client.patch(url, {"nombre": 100}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.dv.refresh_from_db()
        self.assertEqual(self.dv.nombre, 100)

    def test_delete_produit_dv(self):
        url = reverse('produit-dv-detail', kwargs={'pk': self.dv.pk})
        response = self.client.delete(url)
        self.assertIn(response.status_code, [
            status.HTTP_200_OK, status.HTTP_204_NO_CONTENT
        ])
        self.assertFalse(ProduitDv.objects.filter(pk=self.dv.pk).exists())

    def test_filter_par_produit(self):
        url = reverse('produit-dv-par-produit')
        response = self.client.get(url + f'?product={self.product.pk}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for item in response.data['data']:
            self.assertEqual(item['product'], self.product.pk)

    def test_filter_par_produit_missing_param(self):
        url = reverse('produit-dv-par-produit')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_par_produit_nonexistent(self):
        url = reverse('produit-dv-par-produit')
        response = self.client.get(url + '?product=99999')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 0)

    def test_str_produit_dv(self):
        self.assertIn("Farine de Manioc", str(self.dv))


# ════════════════════════════════════════════════════════════
#  CATEGORY MODEL
# ════════════════════════════════════════════════════════════

class CategoryModelTests(TestCase):
    """Tests unitaires sur le modèle Category"""

    def test_str_returns_id_and_name(self):
        cat = create_category("Test Modèle")
        self.assertIn("Test Modèle", str(cat))

    def test_product_count_zero_on_creation(self):
        cat = create_category("Vide")
        self.assertEqual(cat.product_count, 0)

    def test_product_count_increments(self):
        cat = create_category("Avec Produits")
        create_product("P1", category=cat)
        create_product("P2", category=cat)
        self.assertEqual(cat.product_count, 2)