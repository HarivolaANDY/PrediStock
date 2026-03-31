"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path, include
from django.contrib import admin

urlpatterns = [
    path('admin/', admin.site.urls),

    # ─── Accounts ───────────────────────────────────────────
    path('api/accounts/', include('apps.accounts.urls')),

    # ─── Catalogue ──────────────────────────────────────────
    # products/, categories/, suppliers/, produits-dv/ sont tous dans catalogue.urls
    path('api/catalogue/', include('apps.catalogue.urls')),

    # ─── Stock ──────────────────────────────────────────────
    # inventaire/, mouvements/, historique-inventaire/,
    # historique-seuil-stock/ sont tous dans stock.urls
    path('api/stock/', include('apps.stock.urls')),

    # ─── Commandes ──────────────────────────────────────────
    # bon-commande/, donnee-vente/, retours/,
    # produit-dv/, contenu-dans/ sont tous dans commandes.urls
    path('api/commandes/', include('apps.commandes.urls')),

    # ─── Forecasting ────────────────────────────────────────
    # data-import/, execution-pipeline/, predictions/,
    # recommandations/, predict/, chat/ sont tous dans forecasting.urls
    path('api/forecasting/', include('apps.forecasting.urls')),

    # ─── Notifications ──────────────────────────────────────
    # activites/, alertes/, notifications/ sont tous dans notifications.urls
    path('api/notifications/', include('apps.notifications.urls')),

    # ─── Core ───────────────────────────────────────────────
    # pdf/, pdf-historique/ sont dans core.urls
    path('api/core/', include('apps.core.urls')),
]