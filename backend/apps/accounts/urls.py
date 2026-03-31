from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LogoutView, ProfileView,
    UpdateUserView, CheckAvailabilityView,
    ExternalLoginView, TestEmail, RoleViewSet,
)

router = DefaultRouter()
router.register(r'roles', RoleViewSet, basename='role')

# apps/accounts/urls.py
urlpatterns = [
    path('', include(router.urls)),
    path('login/',              ExternalLoginView.as_view(),     name='login'),
    path('logout/',             LogoutView.as_view(),            name='api_logout'),
    path('register/',           RegisterView.as_view(),          name='api_register'),
    path('profile/',            ProfileView.as_view(),           name='api_profile'),
    path('update-user/',        UpdateUserView.as_view(),        name='api_update_user'),
    path('check-availability/', CheckAvailabilityView.as_view(), name='api_check_availability'),
    path('test-email/',         TestEmail.as_view(),             name='test-email'),
]