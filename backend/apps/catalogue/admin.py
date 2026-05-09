from django.contrib import admin
from .models import Category, Supplier, Product, ProductImage, ProductBatch, ProduitDv


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'product_count', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    ordering = ['name']


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone', 'lead_time']
    search_fields = ['name', 'email']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'category', 'supplier',
                    'current_stock', 'stock_threshold', 'is_active', 'est_perissable']
    list_filter = ['is_active', 'est_perissable', 'category', 'unite_mesure']
    search_fields = ['name', 'sku']
    ordering = ['name']


@admin.register(ProduitDv)
class ProduitDvAdmin(admin.ModelAdmin):
    list_display = ['designation', 'product', 'nombre', 'date_creation']
    search_fields = ['designation', 'product__name']


@admin.register(ProductBatch)
class ProductBatchAdmin(admin.ModelAdmin):
    list_display = ['product', 'quantity', 'expiration_date', 'created_at']
    list_filter = ['expiration_date']

admin.site.register(ProductImage)