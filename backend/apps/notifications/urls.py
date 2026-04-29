from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlerteViewSet, NotificationViewSet

router = DefaultRouter()
router.register(r'alertes',       AlerteViewSet,       basename='alerte')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]