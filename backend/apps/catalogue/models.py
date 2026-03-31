from django.db import models
from django.db.models import UniqueConstraint
from django.db.models.functions import Lower


class Category(models.Model):
    name = models.CharField(
        max_length=200, unique=True,
        verbose_name="Nom de la catégorie"
    )
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            UniqueConstraint(
                Lower('name'),
                name='unique_category_name_lower'
            )
        ]

    def __str__(self):
        return f"{self.id} - {self.name}"

    @property
    def product_count(self):
        return self.product_set.count()


from django.utils.timezone import now

class Supplier(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    lead_time = models.IntegerField(null=True, blank=True)
    min_order_quantity = models.IntegerField(null=True, blank=True)
    max_order_quantity = models.IntegerField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # 🔥 bonus

    class Meta:
        verbose_name = "Fournisseur"
        verbose_name_plural = "Fournisseurs"

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=200, unique=True)
    sku = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    stock_threshold = models.IntegerField(default=10)
    current_stock = models.IntegerField(default=0)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    est_perissable = models.BooleanField(default=False)
    unite_mesure = models.CharField(max_length=50, default='Kg', blank=True)
    product_img = models.ImageField(upload_to='products/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Produit"
        verbose_name_plural = "Produits"

    def __str__(self):
        return self.name

    @property
    def is_critical(self):
        return self.current_stock <= self.stock_threshold

    @property
    def stock_ratio(self):
        if self.stock_threshold == 0:
            return float('inf')
        return self.current_stock / self.stock_threshold

    def get_status(self):
        ratio = self.stock_ratio
        if ratio <= 0.25: return "critical"
        elif ratio <= 0.5: return "warning"
        elif ratio <= 0.75: return "low"
        elif ratio <= 1: return "ok"
        return "good"


class ProductImage(models.Model):
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='product_images/')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class ProductBatch(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='batches')
    quantity = models.IntegerField()
    expiration_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Lot produit"
        verbose_name_plural = "Lots produits"

    def __str__(self):
        return f"{self.product.name} — Lot {self.id}"


class ProduitDv(models.Model):
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    designation = models.CharField(max_length=100, default="Aucune description")
    quantite = models.IntegerField(default=0, blank=True)
    nombre = models.IntegerField(default=0, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Produit dérivé"
        verbose_name_plural = "Produits dérivés"

    def __str__(self):
        return f"{self.designation} ({self.product})"