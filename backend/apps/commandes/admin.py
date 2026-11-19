from django.contrib import admin, messages
from django.contrib.admin.utils import unquote
from django.http import HttpResponseRedirect
from django.urls import reverse

from .models import BonCommande, ContenuDans, DonneeVente, ProduitDonneeVente, Remboursement


class SuppressionSansTraceMixin:
    """
    Règle « supprimable seulement sans trace », appliquée aussi dans l'admin Django.

    Un achat ou une vente qui a laissé des traces (paiement, livraison, remboursement) ne se
    supprime pas : on l'ANNULE, ce qui conserve l'historique et restitue le stock. Même règle que
    l'API (`motif_non_supprimable()`), donc le même verdict quel que soit le chemin emprunté.
    S'applique aux documents, à leurs lignes et à leurs inlines, ainsi qu'à la suppression en
    masse et aux suppressions en cascade proposées par l'admin.
    """

    def _document(self, obj):
        """Document (achat ou vente) qui porte la règle pour `obj`."""
        return obj

    def _motif(self, obj):
        document = self._document(obj) if obj is not None and obj.pk else None
        return document.motif_non_supprimable() if document is not None else None

    def has_delete_permission(self, request, obj=None):
        if self._motif(obj):
            return False
        return super().has_delete_permission(request, obj)

    def _conseil(self, motif):
        return (f"Suppression impossible : {motif}. Annulez-la plutôt (statut « Annulé ») : "
                "l'annulation conserve l'historique et restitue le stock.")

    def delete_view(self, request, object_id, extra_context=None):
        obj = self.get_object(request, unquote(object_id))
        motif = self._motif(obj)
        if motif:
            self.message_user(request, self._conseil(motif), messages.ERROR)
            opts = self.model._meta
            return HttpResponseRedirect(
                reverse(f"admin:{opts.app_label}_{opts.model_name}_change", args=[object_id])
            )
        return super().delete_view(request, object_id, extra_context)


class LigneSansTraceMixin(SuppressionSansTraceMixin):
    """Une ligne suit le sort du document qui la contient (champ `champ_document`)."""
    champ_document = None

    def _document(self, obj):
        return getattr(obj, self.champ_document, None)


class DocumentAdminMixin(SuppressionSansTraceMixin):
    readonly_fields = ['suppression']

    @admin.display(description="Suppression")
    def suppression(self, obj):
        if obj is None or not obj.pk:
            return "—"
        motif = obj.motif_non_supprimable()
        return "Possible (aucune trace)" if motif is None else f"Interdite : {motif}. Annulez-la plutôt."


class ContenuDansInline(SuppressionSansTraceMixin, admin.TabularInline):
    # l'objet reçu est ici le document parent (achat) : sa règle s'applique à toutes ses lignes
    model = ContenuDans
    extra = 1


@admin.register(BonCommande)
class BonCommandeAdmin(DocumentAdminMixin, admin.ModelAdmin):
    list_display = ['numero_commande', 'fournisseur', 'utilisateur',
                    'status', 'montant_total', 'date_commande']
    list_filter = ['status', 'date_commande']
    search_fields = ['numero_commande', 'fournisseur__name']
    inlines = [ContenuDansInline]
    ordering = ['-creer_le']


class ProduitDonneeVenteInline(SuppressionSansTraceMixin, admin.TabularInline):
    model = ProduitDonneeVente
    extra = 1


@admin.register(DonneeVente)
class DonneeVenteAdmin(DocumentAdminMixin, admin.ModelAdmin):
    list_display = ['numero_vente', 'utilisateur', 'montant_total', 
                    'date_vente']
    list_filter = ['segment_clientele', 'date_vente']
    search_fields = ['numero_vente', 'utilisateur__username']
    inlines = [ProduitDonneeVenteInline]
    ordering = ['-date_vente']


@admin.register(ContenuDans)
class ContenuDansAdmin(LigneSansTraceMixin, admin.ModelAdmin):
    champ_document = 'bon_commande'
    list_display = ['bon_commande', 'produit', 'quantite', 'prix_unitaire', 'montant_ligne']


@admin.register(ProduitDonneeVente)
class ProduitDonneeVenteAdmin(LigneSansTraceMixin, admin.ModelAdmin):
    champ_document = 'donnee_vente'
    list_display = ['donnee_vente', 'produit', 'quantite', 'prix_unitaire', 'montant_ligne']


@admin.register(Remboursement)
class RemboursementAdmin(admin.ModelAdmin):
    list_display = ['source_type', 'numero_transaction', 'produit', 'quantite', 'montant', 'date_remboursement']
    list_filter = ['source_type', 'date_remboursement']
    search_fields = ['numero_transaction', 'produit__name']
