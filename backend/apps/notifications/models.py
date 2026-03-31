from django.db import models
from django.conf import settings


class Activite(models.Model):
    CATEGORIES = {
        "general": "Général",
        "stock": "Stock",
        "alerte": "Alerte",
        "commande": "Commande",
        "product": "Produit",
        "user": "Utilisateur",
        "role": "Rôle",
    }

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    action = models.CharField(max_length=255)
    date = models.DateTimeField(auto_now_add=True)
    details = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-date']
        verbose_name = "Activité"
        verbose_name_plural = "Activités"

    def __str__(self):
        return f"{self.user} — {self.action} ({self.date:%Y-%m-%d})"

    @classmethod
    def log(cls, user, action, details="", categorie=""):
        label = cls.CATEGORIES.get(categorie.lower(), "Général")
        cls.objects.create(user=user, action=f"{action} -- {label}", details=details)


class Alerte(models.Model):
    class Priorite(models.TextChoices):
        CRITIQUE   = "critique",   "Critique"
        HAUTE      = "haute",      "Haute"
        SECONDAIRE = "secondaire", "Importance secondaire"

    produit = models.ForeignKey(
        'catalogue.Product',
        on_delete=models.SET_NULL,
        null=True
    )
    type_alert = models.CharField(max_length=100)
    priorite = models.CharField(
        max_length=32,
        choices=Priorite.choices,
        default=Priorite.SECONDAIRE
    )
    message = models.TextField()
    compteur = models.PositiveBigIntegerField(default=0)
    donnee_alerte = models.ImageField(upload_to='alerte/', null=True, blank=True)
    est_lu = models.BooleanField(default=False)
    est_resolu = models.BooleanField(default=False)
    creer_le = models.DateTimeField(auto_now_add=True)
    resolu_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-creer_le']
        verbose_name = "Alerte"
        verbose_name_plural = "Alertes"

    def __str__(self):
        return f"{self.type_alert} — {self.produit}"


class Notification(models.Model):
    class Channel(models.TextChoices):
        INTERNE = "Interne", "Interne"
        EMAIL   = "email",   "Email"
        SMS     = "sms",     "SMS"
        PUSH    = "push",    "Push"

    class Status(models.TextChoices):
        NON_LU = "non lu", "Non lu"
        LU     = "lu",     "Lu"

    CATEGORIES = {
        "général": "Général",
        "stock": "Stock",
        "alerte": "Alerte",
        "commande": "Commande",
        "product": "Produit",
        "user": "Utilisateur",
        "role": "Rôle",
        "": "Général",
    }

    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='notifications'
    )
    titre = models.CharField(max_length=200, default="Notification")
    message = models.TextField()
    priorite = models.IntegerField(default=0)
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.NON_LU
    )
    channel = models.CharField(
        max_length=50,
        choices=Channel.choices,
        default=Channel.INTERNE
    )
    type_notification = models.CharField(max_length=50, default="général")
    active = models.BooleanField(default=False)
    creer_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creer_le']
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self):
        return f"{self.titre} — {self.channel} [{self.status}] ({self.creer_le:%Y-%m-%d})"

    @classmethod
    def creer(cls, utilisateur, data, priorite=0, channel="Interne",
               type_notification="général", titre="Notification"):
        label = cls.CATEGORIES.get(data.get('model_name', ''), 'Général')
        return cls.objects.create(
            utilisateur=utilisateur,
            titre=f"{titre} -- d'un(e) {label}",
            message=f"{data.get('objet_nom', '')} a été {data.get('notif', 'modifié')}.",
            priorite=priorite,
            channel=channel,
            status=cls.Status.NON_LU,
            active=True,
            type_notification=cls.CATEGORIES.get(type_notification, "Général"),
        )