from django.urls import path, include
from rest_framework.routers import DefaultRouter
#from .views import (EffectuerViewSet,VerificationStockViewSet,)
from .views import (
    HistoriqueInventaireViewSet,
    InventaireViewSet,
    HistoriqueSeuilStockViewSet,
    MouvementStockViewSet,
)

router = DefaultRouter()
# router.register(r'effectuer',              EffectuerViewSet,             basename='effectuer')
# router.register(r'verification-stock',     VerificationStockViewSet,     basename='verification-stock')
router.register(r'historique-inventaire',  HistoriqueInventaireViewSet,  basename='historique-inventaire')
router.register(r'inventaire',             InventaireViewSet,            basename='inventaire')
router.register(r'historique-seuil-stock', HistoriqueSeuilStockViewSet,  basename='historique-seuil-stock')
router.register(r'mouvements',             MouvementStockViewSet,        basename='mouvement-stock')

urlpatterns = [
    path('', include(router.urls)),
]