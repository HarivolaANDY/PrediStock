from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PDFHistoriqueViewSet, PDFGeneratorViewSet, GeneratedReportViewSet

router = DefaultRouter()
router.register(r'pdf-historique', PDFHistoriqueViewSet, basename='pdf-historique')
router.register(r'pdf', PDFGeneratorViewSet, basename='pdf')
router.register(r'generated-reports', GeneratedReportViewSet, basename='generated-reports')

urlpatterns = [
    path('', include(router.urls)),
]