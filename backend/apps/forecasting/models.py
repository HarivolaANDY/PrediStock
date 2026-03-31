from datetime import datetime
from django.db import models
from django.conf import settings
from django.utils import timezone


class Modele(models.Model):
    id_modele = models.AutoField(primary_key=True)
    nom_modele = models.CharField(max_length=128)
    parametre_model = models.TextField(blank=True, null=True)
    mae = models.FloatField(default=0, blank=True)
    rmse = models.FloatField(default=0, blank=True)
    mape = models.FloatField(default=0, blank=True)
    score = models.FloatField(default=0, blank=True)
    periode_evaluation = models.SmallIntegerField(default=7)
    date_evaluation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Modèle"
        verbose_name_plural = "Modèles"
        ordering = ['-date_evaluation']

    def __str__(self):
        return f"{self.nom_modele} — score: {self.score:.4f}"


class DataImport(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'En attente'
        SYNC    = 'SYNC',    'En cours'
        FAILED  = 'FAILED',  'Échoué'
        DONE    = 'DONE',    'Terminé'

    class TargetTable(models.TextChoices):
        PRODUIT   = 'produit',   'Produit'
        GENERER   = 'generer',   'Mouvement stock'
        CATEGORIE = 'categorie', 'Catégorie'
        SUPPLIER  = 'supplier',  'Fournisseur'

    name = models.CharField(unique=True, max_length=100)
    file_uploaded = models.FileField(upload_to='data_imports/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_type = models.CharField(max_length=50, blank=True, null=True)
    file_size = models.FloatField(blank=True, null=True)
    update_table = models.BooleanField(default=False)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING)
    target_table = models.CharField(
        max_length=50, choices=TargetTable.choices, default=TargetTable.PRODUIT
    )

    class Meta:
        verbose_name = "Import de données"
        verbose_name_plural = "Imports de données"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.file_uploaded:
            self.file_type = self.file_uploaded.name.split('.')[-1].lower()
            self.file_size = self.file_uploaded.size
        super().save(*args, **kwargs)


class ExecutionPipeline(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'En attente'
        RUNNING = 'RUNNING', 'En cours'
        DONE    = 'DONE',    'Terminé'
        ERR     = 'ERR',     'Erreur'

    name = models.ForeignKey(
        DataImport, on_delete=models.CASCADE, related_name='execution_pipelines'
    )
    description = models.TextField()
    journal_execution = models.TextField(default="", blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING)
    enregistrement_traite = models.IntegerField(default=0)
    enregistrement_reussi = models.IntegerField(default=0)
    enregistrement_echoue = models.IntegerField(default=0)
    commence_le = models.DateTimeField(auto_now_add=True)
    complete_le = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Pipeline d'exécution"
        verbose_name_plural = "Pipelines d'exécution"
        ordering = ['-created_at']

    def __str__(self):
        return str(self.name)

    def marquer_complete(self):
        self.complete_le = timezone.now()
        self.save(update_fields=['complete_le'])


class Prediction(models.Model):
    product = models.ForeignKey('catalogue.Product', on_delete=models.CASCADE)
    date_prediction = models.DateField()
    import_qty = models.FloatField(default=0)
    import_lower_bound = models.FloatField(null=True, blank=True)
    import_upper_bound = models.FloatField(null=True, blank=True)
    export_qty = models.FloatField(default=0)
    export_lower_bound = models.FloatField(null=True, blank=True)
    export_upper_bound = models.FloatField(null=True, blank=True)
    stock_prevu = models.FloatField(default=0)
    rupture = models.BooleanField(default=False)
    horizon = models.IntegerField()
    modele_utilise = models.CharField(max_length=100)
    creer_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Prédiction"
        verbose_name_plural = "Prédictions"
        ordering = ['-date_prediction']

    def __str__(self):
        return f"Prédiction {self.product} — {self.date_prediction}"


class RuptureStock(models.Model):
    product = models.ForeignKey('catalogue.Product', on_delete=models.CASCADE)
    date = models.DateField()
    rupture = models.BooleanField(default=False)

    class Meta:
        unique_together = ("date", "product")
        verbose_name = "Rupture de stock"

    def __str__(self):
        return f"{self.product} — {self.date}"


class Recommandation(models.Model):
    class Priority(models.TextChoices):
        HAUTE   = 'HAUTE',   'Haute'
        MOYENNE = 'MOYENNE', 'Moyenne'
        BASSE   = 'BASSE',   'Basse'

    product = models.ForeignKey(
        'catalogue.Product',
        on_delete=models.CASCADE,
        related_name='recommandations',
        null=True, blank=True
    )
    # Appliquer supprimé — remplacé par M2M direct
    utilisateurs_appliquants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='recommandations_appliquees'
    )
    date_prediction = models.DateField(null=True, blank=True)
    type_recommandation = models.CharField(max_length=128, default='', blank=True, null=True)
    quantite_suggeree = models.IntegerField(default=0, null=True, blank=True)
    prix_estime = models.FloatField(default=0.0, null=True, blank=True)
    priority = models.CharField(
        max_length=32,
        choices=Priority.choices,
        default=Priority.MOYENNE,
        null=True, blank=True
    )
    raisonnement = models.TextField(default='', blank=True, null=True)
    donnee_appui = models.FileField(
        upload_to='recommandation/donnee_appui/',
        null=True, blank=True
    )
    est_applique = models.BooleanField(default=False, null=True, blank=True)
    creer_le = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    appliquee_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["product", "date_prediction"],
                name="unique_recommandation_per_product_date"
            )
        ]
        verbose_name = "Recommandation"
        verbose_name_plural = "Recommandations"

    def __str__(self):
        return f"Recommandation {self.product} — {self.date_prediction}"

    def apply(self, user=None):
        self.est_applique = True
        self.appliquee_le = timezone.now()
        self.save()
        if user:
            self.utilisateurs_appliquants.add(user)