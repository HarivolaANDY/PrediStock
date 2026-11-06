from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver

from apps.catalogue.models import ProductBatch
from apps.stock.models import MouvementStock
from .models import (
    BonCommande, ContenuDans, DonneeVente, ProduitDonneeVente, Remboursement, TransactionPaiement,
)

_TYPE_INVERSE = {
    MouvementStock.TypeMouvement.IN: MouvementStock.TypeMouvement.OUT,
    MouvementStock.TypeMouvement.OUT: MouvementStock.TypeMouvement.IN,
}


# ═══════════════════════════════════════════════════════════════════════════════════════
#  Briques communes
# ═══════════════════════════════════════════════════════════════════════════════════════

def _contre_passer(refs, motif):
    """
    Annule par des mouvements INVERSES les mouvements encore effectifs des lignes `refs`.

    Un achat/une vente livré puis annulé (ou remis « En attente ») ne doit laisser aucune trace
    sur le stock, mais l'historique doit rester : au lieu de supprimer le mouvement, on enregistre
    son inverse (IN ↔ OUT, même quantité, même référence, même lot) lié à l'original via `annule`.
    Le stock est mis à jour par la création de ce mouvement (signal update_stock_on_mouvement),
    variantes comprises. Idempotent : un mouvement déjà annulé n'est plus « effectif » et n'est pas
    ré-annulé.
    """
    with transaction.atomic():
        # list() : chaque inverse lit son produit au moment de sa création, ce qui garde un stock
        # à jour quand plusieurs lignes portent sur le même produit.
        for original in list(MouvementStock.effectifs().filter(referrence__in=refs)):
            type_inverse = _TYPE_INVERSE.get(original.movement_type)
            if type_inverse is None:
                continue
            MouvementStock.objects.create(
                produit=original.produit,
                produit_dv=original.produit_dv,
                utilisateur=original.utilisateur,
                quantity=original.quantity,
                movement_type=type_inverse,
                unit_price=original.unit_price,
                reason=motif,
                referrence=original.referrence,
                batch=original.batch,
                annule=original,
            )


def _rapprocher_paiements(document, champ):
    """
    Garde l'historique des paiements (TransactionPaiement) cohérent avec `montant_paye` :
    la somme des lignes doit toujours valoir le montant payé du document. Toute hausse crée une
    ligne du montant ajouté (mode = mode de paiement du document) ; une baisse crée une ligne
    négative de correction. Ne fait rien si les lignes sont déjà à jour (ex. créées par l'endpoint
    « payer », qui y joint une note).
    """
    deja = TransactionPaiement.objects.filter(**{champ: document}).aggregate(total=Sum('montant'))['total'] or Decimal('0')
    ecart = Decimal(str(document.montant_paye or 0)) - deja
    if ecart == 0:
        return
    TransactionPaiement.objects.create(
        **{champ: document},
        montant=ecart,
        mode_paiement=document.mode_paiement,
        notes="" if ecart > 0 else "Correction : montant payé diminué",
    )


def _lot_de_la_ligne(ligne, bon):
    """Lot de la ligne d'achat livrée : réutilisé s'il existe (re-livraison), sinon créé."""
    if ligne.lot_id:
        return ligne.lot
    if ligne.produit_id is None:
        return None
    lot = ProductBatch.objects.create(
        product_id=ligne.produit_id,
        numero_lot=f"LOT-{bon.numero_commande}-{ligne.id}",
        quantity=ligne.quantite,
    )
    # update() et non save() : évite de redéclencher le signal de la ligne
    ContenuDans.objects.filter(pk=ligne.pk).update(lot=lot)
    ligne.lot = lot
    return lot


# ═══════════════════════════════════════════════════════════════════════════════════════
#  Ventes
# ═══════════════════════════════════════════════════════════════════════════════════════

def _sync_vente(instance):
    """
    Gestion des mouvements de stock, des paiements et des remboursements d'une vente :
    - livrée : une sortie de stock par ligne (une seule fois) ;
    - annulée ou remise en attente : chaque sortie encore effective est annulée par un mouvement
      inverse (historique conservé, stock restitué) ;
    - annulée après paiement : un remboursement « à reverser » (une seule fois).
    """
    _rapprocher_paiements(instance, 'donnee_vente')

    refs = [f"SALE-{instance.id}-{ligne.id}" for ligne in instance.lignes.all()]
    is_cancelled = instance.status == DonneeVente.Status.ANNULE

    # Déterminer si on doit créer les mouvements : dès que c'est LIVRÉ
    should_create = (not is_cancelled and instance.status == DonneeVente.Status.VALIDE)

    if should_create:
        for ligne in instance.lignes.all():
            ref = f"SALE-{instance.id}-{ligne.id}"
            # « effectifs » : un mouvement déjà annulé n'empêche pas une nouvelle livraison
            if not MouvementStock.effectifs().filter(referrence=ref).exists():
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
        motif = (
            f"Annulation vente {instance.numero_vente}" if is_cancelled
            else f"Vente {instance.numero_vente} remise en attente"
        )
        _contre_passer(refs, motif)

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


@receiver(post_save, sender=DonneeVente)
def sync_stock_on_sale_payment(sender, instance, **kwargs):
    _sync_vente(instance)


@receiver(post_save, sender=ProduitDonneeVente)
def sync_stock_on_sale_line(sender, instance, created, **kwargs):
    """Une ligne ajoutée à une vente DÉJÀ livrée doit, elle aussi, sortir du stock."""
    if created:
        _sync_vente(instance.donnee_vente)


# ═══════════════════════════════════════════════════════════════════════════════════════
#  Achats
# ═══════════════════════════════════════════════════════════════════════════════════════

def _sync_achat(instance):
    """
    Gestion des mouvements de stock, des lots, des paiements et des remboursements d'un achat :
    - livré : une entrée de stock par ligne (une seule fois), rattachée au lot de la ligne
      (créé à la première livraison) ;
    - annulé ou remis en attente : chaque entrée encore effective est annulée par un mouvement
      inverse (même lot, historique conservé, stock restitué) ;
    - annulé après paiement : un remboursement « à encaisser » (une seule fois).
    """
    _rapprocher_paiements(instance, 'bon_commande')

    refs = [f"BC-LINE-{ligne.id}" for ligne in instance.lignes.all()]

    # Stock augmente dès que c'est LIVRÉ
    if instance.status == BonCommande.Status.LIVRE:
        for ligne in instance.lignes.all():
            ref = f"BC-LINE-{ligne.id}"
            # « effectifs » : un mouvement déjà annulé n'empêche pas une nouvelle livraison
            if not MouvementStock.effectifs().filter(referrence=ref).exists():
                MouvementStock.objects.create(
                    produit=ligne.produit,
                    produit_dv=ligne.produit_dv,
                    utilisateur=instance.utilisateur,
                    quantity=ligne.quantite,
                    movement_type=MouvementStock.TypeMouvement.IN,
                    unit_price=ligne.prix_unitaire,
                    reason=f"Livraison BC {instance.numero_commande}",
                    referrence=ref,
                    batch=_lot_de_la_ligne(ligne, instance),
                )
    else:
        motif = (
            f"Annulation de la livraison BC {instance.numero_commande}"
            if instance.status == BonCommande.Status.ANNULE
            else f"Livraison BC {instance.numero_commande} remise en attente"
        )
        _contre_passer(refs, motif)

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


@receiver(post_save, sender=BonCommande)
def sync_stock_on_purchase_payment(sender, instance, **kwargs):
    _sync_achat(instance)


@receiver(post_save, sender=ContenuDans)
def sync_stock_on_purchase_line(sender, instance, created, **kwargs):
    """Une ligne ajoutée à un achat DÉJÀ livré doit, elle aussi, entrer en stock."""
    if created and instance.bon_commande_id:
        _sync_achat(instance.bon_commande)


# ═══════════════════════════════════════════════════════════════════════════════════════
#  Règlement d'un remboursement → ligne dans l'historique des paiements
# ═══════════════════════════════════════════════════════════════════════════════════════

@receiver(post_save, sender=Remboursement)
def enregistrer_reglement_remboursement(sender, instance, **kwargs):
    """Quand un remboursement passe à « Réglé », l'argent qui bouge est tracé (une seule fois)."""
    if instance.statut_reglement != Remboursement.StatusReglement.REGLE:
        return
    if TransactionPaiement.objects.filter(remboursement=instance).exists():
        return
    mode = TransactionPaiement.PaymentMethod.AUTRE
    if instance.source_id is not None:
        if instance.source_type == Remboursement.TypeSource.ACHAT:
            mode = BonCommande.objects.filter(pk=instance.source_id).values_list('mode_paiement', flat=True).first() or mode
        elif instance.source_type == Remboursement.TypeSource.VENTE:
            mode = DonneeVente.objects.filter(pk=instance.source_id).values_list('mode_paiement', flat=True).first() or mode
    TransactionPaiement.objects.create(
        remboursement=instance,
        montant=instance.montant,
        mode_paiement=mode,
        notes=f"Règlement du remboursement {instance.numero_transaction}".strip(),
    )


# ═══════════════════════════════════════════════════════════════════════════════════════
#  Suppression d'un document (filet de sécurité : l'API refuse déjà de supprimer une transaction
#  qui a laissé des traces, voir `motif_non_supprimable`)
# ═══════════════════════════════════════════════════════════════════════════════════════

@receiver(post_delete, sender=DonneeVente)
def cleanup_stock_on_sale_delete(sender, instance, **kwargs):
    """Supprime les mouvements de stock si la vente est supprimée."""
    MouvementStock.objects.filter(referrence__startswith=f"SALE-{instance.id}-").delete()


@receiver(pre_delete, sender=BonCommande)
def cleanup_stock_on_purchase_delete(sender, instance, **kwargs):
    """
    Supprime les mouvements de stock (et les lots) d'un achat supprimé.

    `pre_delete` et non `post_delete` : les lignes existent encore, donc les références sont
    EXACTES (« BC-LINE-<id> »). Rechercher le numéro de commande dans le motif effaçait aussi les
    mouvements d'une autre commande dont le numéro commence pareil (« BC-1 » / « BC-12 »).
    """
    lignes = list(instance.lignes.all())
    refs = [f"BC-LINE-{ligne.id}" for ligne in lignes]
    if refs:
        MouvementStock.objects.filter(referrence__in=refs).delete()
    lot_ids = [ligne.lot_id for ligne in lignes if ligne.lot_id]
    if lot_ids:
        ProductBatch.objects.filter(pk__in=lot_ids).delete()
