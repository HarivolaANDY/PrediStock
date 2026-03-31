from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ActiviteViewSet, AlerteViewSet, NotificationViewSet

router = DefaultRouter()
router.register(r'activites',     ActiviteViewSet,     basename='activite')
router.register(r'alertes',       AlerteViewSet,       basename='alerte')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]