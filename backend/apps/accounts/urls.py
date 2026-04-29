from django.urls import path
from .views import (
    RegisterView, LogoutView, ProfileView,
    CheckAvailabilityView,
    ExternalLoginView, TestEmail,
)

# apps/accounts/urls.py
urlpatterns = [
    path('login/',              ExternalLoginView.as_view(),     name='login'),
    path('logout/',             LogoutView.as_view(),            name='api_logout'),
    path('register/',           RegisterView.as_view(),          name='api_register'),
    path('profile/',            ProfileView.as_view(),           name='api_profile'),
    path('check-availability/', CheckAvailabilityView.as_view(), name='api_check_availability'),
    path('test-email/',         TestEmail.as_view(),             name='test-email'),
]