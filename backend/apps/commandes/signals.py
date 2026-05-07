from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import BonCommande, DonneeVente, ProduitDonneeVente, ProduitRenvoie
from apps.stock.models import MouvementStock

@receiver(post_save, sender=ProduitDonneeVente)
def sync_stock_on_sale_line(sender, instance, created, **kwargs):
    """Update stock when a sale line is created."""
    if created:
        # Create movement
        MouvementStock.objects.create(
            produit=instance.produit,
            utilisateur=instance.donnee_vente.utilisateur,
            quantity=instance.quantite,
            movement_type=MouvementStock.TypeMouvement.OUT,
            unit_price=instance.prix_unitaire,
            reason=f"Vente {instance.donnee_vente.numero_vente}",
            referrence=f"SALE-{instance.donnee_vente.id}-{instance.id}"
        )
        # Update product stock
        if instance.produit:
            instance.produit.current_stock -= instance.quantite
            instance.produit.save()


@receiver(post_save, sender=BonCommande)
def sync_stock_on_purchase(sender, instance, created, **kwargs):
    """Update stock when a purchase order is marked as 'Livré'."""
    if instance.status == BonCommande.Status.LIVRE:
        # We iterate through lines and only sync those not already synced
        for ligne in instance.lignes.all():
            ref = f"BC-LINE-{ligne.id}"
            if not MouvementStock.objects.filter(referrence=ref).exists():
                MouvementStock.objects.create(
                    produit=ligne.produit,
                    utilisateur=instance.utilisateur,
                    quantity=ligne.quantite,
                    movement_type=MouvementStock.TypeMouvement.IN,
                    unit_price=ligne.prix_unitaire,
                    reason=f"Livraison BC {instance.numero_commande}",
                    referrence=ref
                )
                if ligne.produit:
                    ligne.produit.current_stock += ligne.quantite
                    ligne.produit.save()

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
        if instance.produit:
            instance.produit.current_stock += instance.quantite_retourner
            instance.produit.save()
