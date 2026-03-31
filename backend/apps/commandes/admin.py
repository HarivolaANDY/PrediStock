from django.contrib import admin
from .models import BonCommande, ContenuDans, DonneeVente, ProduitDonneeVente, ProduitRenvoie


@admin.register(BonCommande)
class BonCommandeAdmin(admin.ModelAdmin):
    list_display = ['numero_commande', 'fournisseur', 'utilisateur',
                    'status', 'montant_total', 'date_commande']
    list_filter = ['status']
    search_fields = ['numero_commande', 'utilisateur__username']
    ordering = ['-creer_le']


@admin.register(DonneeVente)
class DonneeVenteAdmin(admin.ModelAdmin):
    list_display = ['id', 'utilisateur', 'quantite_vendu',
                    'montant_total', 'canal_vente', 'date_vente']
    list_filter = ['canal_vente', 'segment_clientele']
    ordering = ['-date_vente']


@admin.register(ContenuDans)
class ContenuDansAdmin(admin.ModelAdmin):
    list_display = ['recommandation', 'produit', 'creer_le']


@admin.register(ProduitRenvoie)
class ProduitRenvoieAdmin(admin.ModelAdmin):
    list_display = ['produit', 'quantite_retourner',
                    'condition_retour', 'est_reapprovisionnnable', 'date_retour']
    list_filter = ['est_reapprovisionnnable', 'condition_retour']
    search_fields = ['produit__name']

admin.site.register(ProduitDonneeVente)