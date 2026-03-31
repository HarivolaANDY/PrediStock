from django.db import models
from django.conf import settings


class BonCommande(models.Model):
    class Status(models.TextChoices):
        EN_ATTENTE = 'En attente',  'En attente'
        CONFIRME   = 'Confirmé',    'Confirmé'
        LIVRE      = 'Livré',       'Livré'
        ANNULE     = 'Annulé',      'Annulé'

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
    montant_total = models.FloatField(default=0)
    date_commande = models.DateTimeField(auto_now_add=True)
    livraison_prevue = models.DateTimeField(null=True, blank=True)
    livraison_actuelle = models.DateTimeField(null=True, blank=True)
    creer_le = models.DateTimeField(auto_now_add=True)
    update_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Bon de commande"
        verbose_name_plural = "Bons de commande"
        ordering = ['-creer_le']

    def __str__(self):
        return f"Commande {self.numero_commande} — {self.utilisateur}"


class ContenuDans(models.Model):
    """Ligne de commande : relie une recommandation IA à un produit commandé."""
    recommandation = models.ForeignKey(
        'forecasting.Recommandation', on_delete=models.SET_NULL, null=True
    )
    produit = models.ForeignKey(
        'catalogue.Product', on_delete=models.SET_NULL, null=True
    )
    creer_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Ligne de commande"
        verbose_name_plural = "Lignes de commande"

    def __str__(self):
        return f"{self.recommandation} — {self.produit}"


class DonneeVente(models.Model):
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='donnee_ventes'
    )
    quantite_vendu = models.IntegerField(default=0)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    montant_total = models.DecimalField(max_digits=10, decimal_places=2)
    remise_applique = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    canal_vente = models.CharField(max_length=128, blank=True, default="")
    segment_clientele = models.CharField(max_length=128, blank=True, default="")
    donne_supplementaire = models.FileField(upload_to='donnee_vente/', blank=True, null=True)
    date_vente = models.DateTimeField(auto_now_add=True)
    creer_le = models.DateTimeField(auto_now_add=True)
    update_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Donnée de vente"
        verbose_name_plural = "Données de vente"
        ordering = ['-date_vente']

    def __str__(self):
        return f"Vente {self.id} — {self.date_vente:%Y-%m-%d}"


class ProduitDonneeVente(models.Model):
    """Liaison Product ↔ DonneeVente — remplace apps/produit_donneevente."""
    produit = models.ForeignKey(
        'catalogue.Product', on_delete=models.CASCADE, null=True, blank=True
    )
    donnee_vente = models.ForeignKey(
        DonneeVente, on_delete=models.CASCADE, null=True, blank=True
    )

    class Meta:
        verbose_name = "Produit — donnée de vente"
        verbose_name_plural = "Produits — données de vente"
        unique_together = ('produit', 'donnee_vente')

    def __str__(self):
        return f"{self.produit} — {self.donnee_vente}"


class ProduitRenvoie(models.Model):
    produit = models.ForeignKey(
        'catalogue.Product', on_delete=models.SET_NULL, null=True
    )
    quantite_retourner = models.IntegerField(default=0)
    raison_retour = models.CharField(max_length=128, default="")
    condition_retour = models.CharField(max_length=32, default="")
    montant_remise = models.FloatField(null=True, blank=True)
    est_reapprovisionnnable = models.BooleanField(default=False)
    notes = models.TextField(null=True, blank=True)
    date_retour = models.DateTimeField(auto_now_add=True)
    creer_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Produit renvoyé"
        verbose_name_plural = "Produits renvoyés"
        ordering = ['-date_retour']

    def __str__(self):
        return self.produit.name if self.produit else "Produit renvoyé"