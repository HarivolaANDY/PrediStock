from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, SupplierViewSet, ProductViewSet, ProduitDvViewSet

router = DefaultRouter()
router.register(r'categories',  CategoryViewSet,  basename='category')
router.register(r'suppliers',   SupplierViewSet,  basename='supplier')
router.register(r'products',    ProductViewSet,   basename='product')
router.register(r'produits-dv', ProduitDvViewSet, basename='produit-dv')

urlpatterns = [
    path('', include(router.urls)),
]