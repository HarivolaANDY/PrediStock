from django.contrib import admin
from .models import HistoriqueInventaire, Inventaire, HistoriqueSeuilStock, MouvementStock


@admin.register(MouvementStock)
class MouvementStockAdmin(admin.ModelAdmin):
    list_display = ['movement_type', 'produit', 'quantity',
                    'unit_price', 'utilisateur', 'date', 'timestamp']
    list_filter = ['movement_type']
    search_fields = ['produit__name', 'referrence']
    ordering = ['-timestamp']


@admin.register(HistoriqueSeuilStock)
class HistoriqueSeuilStockAdmin(admin.ModelAdmin):
    list_display = ['produit', 'ancien_seuil', 'nouveau_seuil',
                    'utilisateur', 'changer_le']
    search_fields = ['produit__name']
    ordering = ['-changer_le']


@admin.register(HistoriqueInventaire)
class HistoriqueInventaireAdmin(admin.ModelAdmin):
    list_display = ['date', 'utilisateur', 'etat', 'description']
    list_filter = ['etat']
    ordering = ['-date']


@admin.register(Inventaire)
class InventaireAdmin(admin.ModelAdmin):
    list_display = ['produit', 'historique', 'quantite_theo', 'quantite_phy', 'ecart']
    search_fields = ['produit__designation']