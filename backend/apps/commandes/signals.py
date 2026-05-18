from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import BonCommande, DonneeVente, ProduitDonneeVente, ProduitRenvoie
from apps.stock.models import MouvementStock

@receiver(post_save, sender=DonneeVente)
def sync_stock_on_sale_payment(sender, instance, **kwargs):
    """Update stock when a sale is marked as 'Payé'. Remove movements if no longer 'Payé'."""
    # Build list of references for this sale's lines
    refs = [f"SALE-{instance.id}-{ligne.id}" for ligne in instance.lignes.all()]
    
    if instance.statut_paiement == DonneeVente.PaymentStatus.PAYE:
        for ligne in instance.lignes.all():
            ref = f"SALE-{instance.id}-{ligne.id}"
            if not MouvementStock.objects.filter(referrence=ref).exists():
                MouvementStock.objects.create(
                    produit=ligne.produit,
                    produit_dv=ligne.produit_dv,
                    utilisateur=instance.utilisateur,
                    quantity=ligne.quantite,
                    movement_type=MouvementStock.TypeMouvement.OUT,
                    unit_price=float(ligne.prix_unitaire),
                    reason=f"Vente {instance.numero_vente}",
                    referrence=ref
                )
    else:
        # If no longer paid, delete the associated movements
        MouvementStock.objects.filter(referrence__in=refs).delete()


@receiver(post_save, sender=BonCommande)
def sync_stock_on_purchase_payment(sender, instance, **kwargs):
    """Update stock when a purchase order is marked as 'Payé'. Remove movements if no longer 'Payé'."""
    # Build list of references
    refs = [f"BC-LINE-{ligne.id}" for ligne in instance.lignes.all()]

    if instance.statut_paiement == BonCommande.PaymentStatus.PAYE:
        for ligne in instance.lignes.all():
            ref = f"BC-LINE-{ligne.id}"
            if not MouvementStock.objects.filter(referrence=ref).exists():
                MouvementStock.objects.create(
                    produit=ligne.produit,
                    produit_dv=ligne.produit_dv,
                    utilisateur=instance.utilisateur,
                    quantity=ligne.quantite,
                    movement_type=MouvementStock.TypeMouvement.IN,
                    unit_price=ligne.prix_unitaire,
                    reason=f"Livraison BC {instance.numero_commande}",
                    referrence=ref
                )
    else:
        # If no longer paid, delete the associated movements
        MouvementStock.objects.filter(referrence__in=refs).delete()


@receiver(post_save, sender=ProduitRenvoie)
def sync_stock_on_return(sender, instance, created, **kwargs):
    """Update stock when a return is recorded if it's restockable."""
    if created and instance.est_reapprovisionnnable:
        MouvementStock.objects.create(
            produit=instance.produit,
            quantity=instance.quantite_retourner,
            movement_type=MouvementStock.TypeMouvement.RETURN,
            reason=f"Retour Produit: {instance.raison_retour}",
            referrence=f"RET-{instance.id}"
        )
