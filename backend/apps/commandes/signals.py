from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import BonCommande, DonneeVente, ProduitDonneeVente, Remboursement
from apps.stock.models import MouvementStock

@receiver(post_save, sender=DonneeVente)
def sync_stock_on_sale_payment(sender, instance, **kwargs):
    """
    Gestion des mouvements de stock pour les ventes :
    - Vente NORMALE  : mouvement créé quand statut_paiement = 'Payé'
    - Vente CRÉDIT   : mouvement créé dès que status = 'Validé' (sans attendre le paiement)
    Dans les deux cas, le mouvement est supprimé si la vente est annulée.
    """
    refs = [f"SALE-{instance.id}-{ligne.id}" for ligne in instance.lignes.all()]
    is_credit = instance.type_vente == DonneeVente.TypeVente.CREDIT
    is_cancelled = instance.status == DonneeVente.Status.ANNULE

    # Déterminer si on doit créer les mouvements : Dès que c'est LIVRÉ
    should_create = (not is_cancelled and instance.status == DonneeVente.Status.VALIDE)

    if should_create:
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
                    notes=instance.type_vente,  # 'Normal' ou 'Crédit' — utilisé par l'UI
                    referrence=ref
                )
    else:
        # Vente annulée ou revenue en arrière → supprimer les mouvements
        MouvementStock.objects.filter(referrence__in=refs).delete()

    # LOGIQUE REMBOURSEMENT : vente annulée APRÈS avoir été payée
    if is_cancelled and instance.montant_paye > 0:
        if not Remboursement.objects.filter(source_type=Remboursement.TypeSource.VENTE, source_id=instance.id).exists():
            Remboursement.objects.create(
                source_type=Remboursement.TypeSource.VENTE,
                source_id=instance.id,
                numero_transaction=instance.numero_vente or f"V-{instance.id}",
                montant=float(instance.montant_paye),
                raison=f"Vente annulée après paiement ({instance.statut_paiement})",
                notes=f"Remboursement automatique à reverser au client pour la vente {instance.numero_vente}"
            )


@receiver(post_save, sender=BonCommande)
def sync_stock_on_purchase_payment(sender, instance, **kwargs):
    refs = [f"BC-LINE-{ligne.id}" for ligne in instance.lignes.all()]

    # Stock augmente dès que c'est LIVRÉ
    if instance.status == BonCommande.Status.LIVRE:
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
        MouvementStock.objects.filter(referrence__in=refs).delete()

    # LOGIQUE REMBOURSEMENT (Achat Annulé alors qu'il était payé)
    # On crée un remboursement si la commande est annulée ET qu'il y a eu un paiement (total ou partiel)
    if instance.status == BonCommande.Status.ANNULE and instance.montant_paye > 0:
        if not Remboursement.objects.filter(source_type=Remboursement.TypeSource.ACHAT, source_id=instance.id).exists():
            Remboursement.objects.create(
                source_type=Remboursement.TypeSource.ACHAT,
                source_id=instance.id,
                numero_transaction=instance.numero_commande,
                montant=float(instance.montant_paye),
                raison=f"Achat annulé après paiement ({instance.statut_paiement})",
                notes=f"Remboursement automatique à encaisser pour l'achat {instance.numero_commande}"
            )

@receiver(post_delete, sender=DonneeVente)
def cleanup_stock_on_sale_delete(sender, instance, **kwargs):
    """Supprime les mouvements de stock si la vente est supprimée."""
    MouvementStock.objects.filter(referrence__startswith=f"SALE-{instance.id}-").delete()

@receiver(post_delete, sender=BonCommande)
def cleanup_stock_on_purchase_delete(sender, instance, **kwargs):
    """Supprime les mouvements de stock si l'achat est supprimé."""
    MouvementStock.objects.filter(referrence__startswith=f"BC-LINE-").filter(reason__icontains=f"BC {instance.numero_commande}").delete()
    # Note: For BC, the ref is BC-LINE-{ligne.id}. Since lines are deleted too, we might lose individual IDs.
    # But filtering by reason and partial ref is safer.
