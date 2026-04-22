from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, SupplierViewSet, ProductViewSet, ProduitDvViewSet, RevenueViewSet

router = DefaultRouter()
router.register(r'categories',  CategoryViewSet,  basename='category')
router.register(r'suppliers',   SupplierViewSet,  basename='supplier')
router.register(r'products',    ProductViewSet,   basename='product')
router.register(r'produits-dv', ProduitDvViewSet, basename='produit-dv')
router.register(r'revenues',    RevenueViewSet,   basename='revenue')
#revenu mensuel??

urlpatterns = [
    path('', include(router.urls)),
]