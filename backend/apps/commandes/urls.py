from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BCViewSet, ContenuDansViewSet, DonneeVenteViewSet,
    ProduitDonneeVenteViewSet,
    RemboursementViewSet, PurchaseSalesAnalyticsView,
)

router = DefaultRouter()
router.register(r'bon-commande',       BCViewSet,                basename='bon-commande')
router.register(r'contenu-dans',       ContenuDansViewSet,        basename='contenu-dans')
router.register(r'donnee-vente',       DonneeVenteViewSet,        basename='donnee-vente')
router.register(r'produit-dv',         ProduitDonneeVenteViewSet, basename='produit-donnee-vente')
router.register(r'remboursements',     RemboursementViewSet,      basename='remboursement')

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/', PurchaseSalesAnalyticsView.as_view(), name='purchase-sales-analytics'),
]