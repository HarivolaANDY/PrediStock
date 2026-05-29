from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver


class HistoriqueInventaire(models.Model):
    date = models.DateTimeField(auto_now_add=True)
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    etat = models.BooleanField(default=False)
    description = models.CharField(max_length=255, blank=True, default="Inventaire du mois")

    class Meta:
        ordering = ['-date']
        verbose_name = "Historique d'inventaire"
        verbose_name_plural = "Historiques d'inventaire"

    def __str__(self):
        return f"Inventaire du {self.date:%Y-%m-%d} — {self.utilisateur}"


class Inventaire(models.Model):
    produit = models.ForeignKey(
        'catalogue.ProduitDv',
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    # Nom du Product parent — renseigné quand produit=None (pas de ProduitDv)
    produit_cache = models.CharField(
        max_length=200,
        null=True, blank=True,
        verbose_name="Nom produit (cache)"
    )
    historique = models.ForeignKey(
        HistoriqueInventaire,
        on_delete=models.SET_NULL,
        null=True
    )
    quantite_theo = models.IntegerField(default=0)
    quantite_phy = models.IntegerField(default=0)
    ecart = models.IntegerField(default=0)
 
    class Meta:
        verbose_name = "Inventaire"
        verbose_name_plural = "Inventaires"
 
    def __str__(self):
        return f"{self.produit or self.produit_cache} — écart: {self.ecart}"
 
    def calculer_ecart(self):
        self.ecart = self.quantite_theo - self.quantite_phy
        self.save()
 
    @classmethod
    def lancer_inventaire(cls, user, description="Inventaire du mois"):
        histo = HistoriqueInventaire.objects.create(
            utilisateur=user,
            description=description,
            etat=True
        )
        from apps.catalogue.models import ProduitDv
        cls.objects.bulk_create([
            cls(produit=p, quantite_theo=p.nombre, historique=histo)
            for p in ProduitDv.objects.all()
        ])
        return histo
 
    def redresser(self, new_histo):
        Inventaire.objects.create(
            produit=self.produit,
            produit_cache=self.produit_cache,
            quantite_theo=self.quantite_phy,
            quantite_phy=self.quantite_phy,
            historique=new_histo
        )
        diff = float(self.quantite_phy) - float(self.quantite_theo)
        if diff != 0:
            from .models import MouvementStock
            MouvementStock.objects.create(
                produit=self.produit.product if self.produit else None,
                produit_dv=self.produit,
                quantity=abs(diff),
                movement_type='IN' if diff > 0 else 'OUT',
                utilisateur=new_histo.utilisateur,
                reason=f"Redressement inventaire #{self.historique.id} ({self.historique.description})",
            )

class HistoriqueSeuilStock(models.Model):
    produit = models.ForeignKey(
        'catalogue.Product',
        on_delete=models.DO_NOTHING,
        null=True
    )
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    ancien_seuil = models.IntegerField(null=True, blank=True, default=0)
    nouveau_seuil = models.IntegerField(null=True, blank=True, default=0)
    raison = models.TextField(null=True, blank=True)
    changer_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changer_le']
        verbose_name = "Historique seuil stock"
        verbose_name_plural = "Historiques seuil stock"

    def __str__(self):
        return f"{self.produit} : {self.ancien_seuil} → {self.nouveau_seuil} ({self.changer_le:%Y-%m-%d})"


class MouvementStock(models.Model):
    class TypeMouvement(models.TextChoices):
        IN         = 'IN',         'Entrée'
        OUT        = 'OUT',        'Sortie'
        ADJUSTMENT = 'ADJUSTMENT', 'Ajustement'
        RETURN     = 'RETURN',     'Retour Client'
        SCRAP      = 'SCRAP',      'Rebut'
        ALLOCATION = 'ALLOCATION', 'Allocation'

    # Deux FK dans l'original (id_product + produit_dv) → unifiées :
    # produit     = Product (la fiche produit principale)
    # produit_dv  = ProduitDv (la variante/déclinaison du produit)
    produit = models.ForeignKey(
        'catalogue.Product',
        on_delete=models.SET_NULL,
        null=True,
        related_name='mouvements_stock',
        verbose_name="Produit"
    )
    produit_dv = models.ForeignKey(
        'catalogue.ProduitDv',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name="Variante produit"
    )
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='mouvements_effectues',
        verbose_name="Utilisateur responsable"
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=3, verbose_name="Quantité")
    movement_type = models.CharField(
        max_length=32,
        choices=TypeMouvement.choices,
        verbose_name="Type de mouvement"
    )
    unit_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        verbose_name="Prix unitaire"
    )
    reason = models.TextField(null=True, blank=True, verbose_name="Raison")
    notes = models.TextField(null=True, blank=True, verbose_name="Notes")
    referrence = models.CharField(
        max_length=50, null=True, blank=True,
        verbose_name="Référence"
    )
    date = models.DateField(
        default=timezone.now,
        null=True, blank=True,
        verbose_name="Date du mouvement"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Horodatage"
    )
    
    batch = models.ForeignKey(
        'catalogue.ProductBatch',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='mouvements'
    )


    class Meta:
        db_table = 'MOVEMENT_STOCK'
        ordering = ['-timestamp']
        verbose_name = "Mouvement de stock"
        verbose_name_plural = "Mouvements de stock"

    def __str__(self):
        return f"{self.movement_type} — {self.quantity} ({self.timestamp:%Y-%m-%d %H:%M})"
    

    def save(self, *args, **kwargs):
        # Hérite le prix unitaire du produit si non renseigné
        if not self.unit_price and self.produit:
            self.unit_price = self.produit.price
        super().save(*args, **kwargs)
        
@receiver(post_save, sender=MouvementStock)
def update_stock_on_mouvement(sender, instance, created, **kwargs):
    if not created or not instance.produit:
        return
    
    produit = instance.produit
    dv = instance.produit_dv
    qty = float(instance.quantity)

    # 1. Mise à jour du stock parent
    if instance.movement_type in ["IN", "RETURN"]:
        produit.current_stock = float(produit.current_stock) + qty
    elif instance.movement_type in ["OUT", "SCRAP"]:
        produit.current_stock = max(0.0, float(produit.current_stock) - qty)
    elif instance.movement_type == "ADJUSTMENT":
        produit.current_stock = max(0.0, float(produit.current_stock) + qty)
    
    produit.save(update_fields=["current_stock"])

    # 2. Mise à jour du sous-produit (stock direct, sans calcul de capacité)
    if dv:
        if instance.movement_type in ["IN", "RETURN"]:
            dv.nombre = float(dv.nombre) + qty
        elif instance.movement_type in ["OUT", "SCRAP"]:
            dv.nombre = max(0.0, float(dv.nombre) - qty)
        dv.save(update_fields=["nombre"])
    # ALLOCATION : mouvement interne, ne change pas le stock total du parent