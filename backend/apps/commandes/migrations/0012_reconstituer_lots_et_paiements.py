"""
Reprise de l'existant pour deux nouveautés :

  1. LOTS : chaque entrée de stock issue d'une livraison d'achat (référence « BC-LINE-<id ligne> »)
     reçoit un lot (`ProductBatch`), rattaché à sa ligne d'achat ; son éventuel mouvement
     d'annulation porte le même lot.
  2. PAIEMENTS : chaque achat/vente dont `montant_paye > 0` et qui n'a aucune ligne dans
     `TransactionPaiement` reçoit UNE ligne « reconstituée » du montant déjà payé. Le détail réel
     (dates, versements successifs) n'existait pas : la date retenue est la dernière modification du
     document, et la note le précise.

Migration idempotente (relançable sans doublon) et sans effet sur le stock ni sur les montants.
"""
from django.db import migrations

NOTE_RECONSTITUE = (
    "Reconstitué : paiement antérieur à l'historique des paiements "
    "(date approximative = dernière modification du document)."
)


def reconstituer(apps, schema_editor):
    MouvementStock = apps.get_model('stock', 'MouvementStock')
    ContenuDans = apps.get_model('commandes', 'ContenuDans')
    ProductBatch = apps.get_model('catalogue', 'ProductBatch')
    TransactionPaiement = apps.get_model('commandes', 'TransactionPaiement')
    BonCommande = apps.get_model('commandes', 'BonCommande')
    DonneeVente = apps.get_model('commandes', 'DonneeVente')

    # ── 1. Lots ────────────────────────────────────────────────────────────────────────
    entrees = MouvementStock.objects.filter(
        referrence__startswith='BC-LINE-', movement_type='IN',
        annule__isnull=True, batch__isnull=True,
    )
    for mouvement in entrees:
        try:
            ligne_id = int(mouvement.referrence.rsplit('-', 1)[1])
        except (ValueError, IndexError):
            continue
        ligne = ContenuDans.objects.filter(pk=ligne_id).first()
        if ligne is None or mouvement.produit_id is None:
            continue
        if ligne.lot_id:
            lot_id = ligne.lot_id
        else:
            numero = ''
            if ligne.bon_commande_id:
                numero = BonCommande.objects.values_list('numero_commande', flat=True).get(pk=ligne.bon_commande_id)
            lot = ProductBatch.objects.create(
                product_id=mouvement.produit_id,
                numero_lot=f"LOT-{numero}-{ligne.id}",
                quantity=mouvement.quantity,
            )
            lot_id = lot.pk
            ContenuDans.objects.filter(pk=ligne.pk).update(lot_id=lot_id)
        MouvementStock.objects.filter(pk=mouvement.pk).update(batch_id=lot_id)
        MouvementStock.objects.filter(annule_id=mouvement.pk).update(batch_id=lot_id)

    # ── 2. Paiements ───────────────────────────────────────────────────────────────────
    for achat in BonCommande.objects.filter(montant_paye__gt=0):
        if TransactionPaiement.objects.filter(bon_commande_id=achat.pk).exists():
            continue
        ligne = TransactionPaiement.objects.create(
            bon_commande_id=achat.pk, montant=achat.montant_paye,
            mode_paiement=achat.mode_paiement, notes=NOTE_RECONSTITUE,
        )
        TransactionPaiement.objects.filter(pk=ligne.pk).update(date_paiement=achat.update_at)

    for vente in DonneeVente.objects.filter(montant_paye__gt=0):
        if TransactionPaiement.objects.filter(donnee_vente_id=vente.pk).exists():
            continue
        ligne = TransactionPaiement.objects.create(
            donnee_vente_id=vente.pk, montant=vente.montant_paye,
            mode_paiement=vente.mode_paiement, notes=NOTE_RECONSTITUE,
        )
        TransactionPaiement.objects.filter(pk=ligne.pk).update(date_paiement=vente.update_at)


class Migration(migrations.Migration):

    dependencies = [
        ('catalogue', '0008_productbatch_numero_lot_quantite_decimale'),
        ('commandes', '0011_contenudans_lot'),
        ('stock', '0009_mouvementstock_annule'),
    ]

    operations = [
        # Pas de retour arrière destructif : les lots et lignes de paiement reconstitués sont conservés.
        migrations.RunPython(reconstituer, migrations.RunPython.noop),
    ]
