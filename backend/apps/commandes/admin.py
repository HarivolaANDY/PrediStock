from django.contrib import admin
from .models import BonCommande, ContenuDans, DonneeVente, ProduitDonneeVente, ProduitRenvoie


class ContenuDansInline(admin.TabularInline):
    model = ContenuDans
    extra = 1

@admin.register(BonCommande)
class BonCommandeAdmin(admin.ModelAdmin):
    list_display = ['numero_commande', 'fournisseur', 'utilisateur',
                    'status', 'montant_total', 'date_commande']
    list_filter = ['status', 'date_commande']
    search_fields = ['numero_commande', 'fournisseur__name']
    inlines = [ContenuDansInline]
    ordering = ['-creer_le']


class ProduitDonneeVenteInline(admin.TabularInline):
    model = ProduitDonneeVente
    extra = 1

@admin.register(DonneeVente)
class DonneeVenteAdmin(admin.ModelAdmin):
    list_display = ['numero_vente', 'utilisateur', 'montant_total', 
                    'canal_vente', 'date_vente']
    list_filter = ['canal_vente', 'segment_clientele', 'date_vente']
    search_fields = ['numero_vente', 'utilisateur__username']
    inlines = [ProduitDonneeVenteInline]
    ordering = ['-date_vente']


@admin.register(ContenuDans)
class ContenuDansAdmin(admin.ModelAdmin):
    list_display = ['bon_commande', 'produit', 'quantite', 'prix_unitaire', 'montant_ligne']


@admin.register(ProduitDonneeVente)
class ProduitDonneeVenteAdmin(admin.ModelAdmin):
    list_display = ['donnee_vente', 'produit', 'quantite', 'prix_unitaire', 'montant_ligne']


@admin.register(ProduitRenvoie)
class ProduitRenvoieAdmin(admin.ModelAdmin):
    list_display = ['produit', 'quantite_retourner',
                    'condition_retour', 'est_reapprovisionnnable', 'date_retour']
    list_filter = ['est_reapprovisionnnable', 'condition_retour']
    search_fields = ['produit__name']