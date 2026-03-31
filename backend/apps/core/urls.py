from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PDFHistoriqueViewSet, PDFGeneratorViewSet

router = DefaultRouter()
router.register(r'pdf-historique', PDFHistoriqueViewSet, basename='pdf-historique')
router.register(r'pdf', PDFGeneratorViewSet, basename='pdf')

urlpatterns = [
    path('', include(router.urls)),
]