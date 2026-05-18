from django.db import models
from django.conf import settings


class BonCommande(models.Model):
    class Status(models.TextChoices):
        EN_ATTENTE = 'En attente',  'En attente'
        LIVRE      = 'Livré',       'Livré'
        ANNULE     = 'Annulé',      'Annulé'

    class PaymentStatus(models.TextChoices):
        NON_PAYE = 'Non payé', 'Non payé'
        PARTIEL  = 'Partiel', 'Partiel'
        PAYE     = 'Payé', 'Payé'

    fournisseur = models.ForeignKey(
        'catalogue.Supplier', on_delete=models.SET_NULL, null=True, blank=True
    )
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name='bon_commandes'
    )
    numero_commande = models.CharField(max_length=128, default='BC-000000000')
    status = models.CharField(max_length=32, default=Status.EN_ATTENTE)
    statut_paiement = models.CharField(
        max_length=32, 
        choices=PaymentStatus.choices, 
        default=PaymentStatus.NON_PAYE
    )
    montant_total = models.FloatField(default=0)
    montant_paye = models.FloatField(default=0)
    date_commande = models.DateTimeField(auto_now_add=True)
    livraison_prevue = models.DateTimeField(null=True, blank=True)
    livraison_actuelle = models.DateTimeField(null=True, blank=True)
    creer_le = models.DateTimeField(auto_now_add=True)
    update_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Bon de commande"
        verbose_name_plural = "Bons de commande"
        ordering = ['-creer_le']

    def save(self, *args, **kwargs):
        # Suppression de l'automatisation du paiement pour laisser le déclencheur sur 'Payé'

        if not self.id and (not self.numero_commande or self.numero_commande == 'BC-000000000'):
            # Get the highest ID or count to determine the next number
            last_bc = BonCommande.objects.exclude(numero_commande='BC-000000000').order_by('-id').first()
            if last_bc and last_bc.numero_commande.startswith('BC-'):
                try:
                    # Extract the number part: BC-0001 -> 0001 -> 1
                    parts = last_bc.numero_commande.split('-')
                    if len(parts) > 1:
                        last_number = int(parts[1])
                        new_number = last_number + 1
                    else:
                        new_number = 1
                except (ValueError, IndexError):
                    new_number = 1
            else:
                # If no previous BC, check the count
                new_number = BonCommande.objects.count() + 1
            
            self.numero_commande = f"BC-{new_number:05d}"
            
        super().save(*args, **kwargs)

    def __str__(self):

        return f"Commande {self.numero_commande} — {self.utilisateur}"


class ContenuDans(models.Model):
    """Ligne de commande : détaille les produits d'un bon de commande."""
    bon_commande = models.ForeignKey(
        BonCommande, on_delete=models.CASCADE, related_name='lignes', null=True
    )
    produit = models.ForeignKey(
        'catalogue.Product', on_delete=models.SET_NULL, null=True
    )
    produit_dv = models.ForeignKey(
        'catalogue.ProduitDv', on_delete=models.SET_NULL, null=True, blank=True
    )
    quantite = models.IntegerField(default=1)
    prix_unitaire = models.FloatField(default=0)
    creer_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Ligne de commande"
        verbose_name_plural = "Lignes de commande"

    @property
    def montant_ligne(self):
        return self.quantite * self.prix_unitaire

    def __str__(self):
        return f"{self.bon_commande.numero_commande if self.bon_commande else 'Orphelin'} — {self.produit} ({self.quantite})"


class DonneeVente(models.Model):
    """Entête de vente : regroupe plusieurs produits vendus en une transaction."""
    class PaymentStatus(models.TextChoices):
        NON_PAYE = 'Non payé', 'Non payé'
        PARTIEL  = 'Partiel', 'Partiel'
        PAYE     = 'Payé', 'Payé'
        ANNULE   = 'Annulé', 'Annulé'

    class PaymentMethod(models.TextChoices):
        ESPECES = 'Espèces', 'Espèces'
        VIREMENT = 'Virement', 'Virement'
        CHEQUE = 'Chèque', 'Chèque'
        ORANGE = 'Orange Money', 'Orange Money'
        YAS = 'YAS', 'YAS'
        AIRTEL = 'Airtel Money', 'Airtel Money'
        AUTRE = 'Autre', 'Autre'

    class Status(models.TextChoices):
        EN_ATTENTE = 'En attente', 'En attente'
        VALIDE     = 'Validé', 'Validé'
        ANNULE     = 'Annulé', 'Annulé'

    class TypeVente(models.TextChoices):
        NORMAL = 'Normal', 'Normal'
        CREDIT = 'Crédit', 'Crédit'

    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='donnee_ventes'
    )
    numero_vente = models.CharField(max_length=64, unique=True, null=True, blank=True)
    montant_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_paye = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    remise_globale = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    statut_paiement = models.CharField(
        max_length=32, 
        choices=PaymentStatus.choices, 
        default=PaymentStatus.NON_PAYE
    )
    mode_paiement = models.CharField(
        max_length=32, 
        choices=PaymentMethod.choices, 
        default=PaymentMethod.ESPECES
    )
    canal_vente = models.CharField(max_length=128, blank=True, default="")
    segment_clientele = models.CharField(max_length=128, blank=True, default="")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.EN_ATTENTE)
    type_vente = models.CharField(max_length=32, choices=TypeVente.choices, default=TypeVente.NORMAL)
    date_vente = models.DateTimeField(auto_now_add=True)
    creer_le = models.DateTimeField(auto_now_add=True)
    update_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Vente"
        verbose_name_plural = "Ventes"
        ordering = ['-date_vente']

    def save(self, *args, **kwargs):
        # Force payment status to Non payé if type is Credit
        if self.type_vente == self.TypeVente.CREDIT:
            self.statut_paiement = self.PaymentStatus.NON_PAYE
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Vente {self.numero_vente or self.id} — {self.date_vente:%Y-%m-%d}"


class ProduitDonneeVente(models.Model):
    """Ligne de vente : détaille chaque produit d'une transaction."""
    donnee_vente = models.ForeignKey(
        DonneeVente, on_delete=models.CASCADE, related_name='lignes'
    )
    produit = models.ForeignKey(
        'catalogue.Product', on_delete=models.CASCADE
    )
    produit_dv = models.ForeignKey(
        'catalogue.ProduitDv', on_delete=models.SET_NULL, null=True, blank=True
    )
    quantite = models.IntegerField(default=1)
    prix_unitaire = models.DecimalField(max_digits=12, decimal_places=2)
    remise_applique = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        verbose_name = "Ligne de vente"
        verbose_name_plural = "Lignes de vente"
        unique_together = ('produit', 'produit_dv', 'donnee_vente')

    @property
    def montant_ligne(self):
        return (self.quantite * self.prix_unitaire) - self.remise_applique

    def __str__(self):
        return f"{self.donnee_vente} : {self.produit} (x{self.quantite})"


class Remboursement(models.Model):
    class TypeSource(models.TextChoices):
        ACHAT = 'Achat', 'Achat'
        VENTE = 'Vente', 'Vente'
        RETOUR = 'Retour', 'Retour'

    source_type = models.CharField(max_length=20, choices=TypeSource.choices, default=TypeSource.RETOUR)
    source_id = models.IntegerField(null=True, blank=True) # ID of BC or DV
    numero_transaction = models.CharField(max_length=128, blank=True, default="")
    produit = models.ForeignKey(
        'catalogue.Product', on_delete=models.SET_NULL, null=True, blank=True
    )
    quantite = models.IntegerField(default=0)
    montant = models.FloatField(default=0)
    raison = models.CharField(max_length=255, default="")
    date_remboursement = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        verbose_name = "Remboursement"
        verbose_name_plural = "Remboursements"
        ordering = ['-date_remboursement']

    def __str__(self):
        return f"Remboursement {self.id} ({self.source_type})"
class TransactionPaiement(models.Model):
    class PaymentMethod(models.TextChoices):
        ESPECES = 'Espèces', 'Espèces'
        VIREMENT = 'Virement', 'Virement'
        CHEQUE = 'Chèque', 'Chèque'
        ORANGE = 'Orange Money', 'Orange Money'
        YAS = 'YAS', 'YAS'
        AIRTEL = 'Airtel Money', 'Airtel Money'
        AUTRE = 'Autre', 'Autre'

    bon_commande = models.ForeignKey(
        'BonCommande', on_delete=models.CASCADE, related_name='paiements', null=True, blank=True
    )
    donnee_vente = models.ForeignKey(
        'DonneeVente', on_delete=models.CASCADE, related_name='paiements', null=True, blank=True
    )
    montant = models.DecimalField(max_digits=12, decimal_places=2)
    mode_paiement = models.CharField(max_length=32, choices=PaymentMethod.choices)
    date_paiement = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Transaction de paiement"
        verbose_name_plural = "Transactions de paiement"
        ordering = ['-date_paiement']

    def __str__(self):
        return f"Paiement de {self.montant} Ar ({self.mode_paiement})"
