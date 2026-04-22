from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.management.commands import createsuperuser
from django.core.management import CommandError
import uuid
import secrets
import string


class User(AbstractUser): # Supprimer le "ROLE_CHOICES" et mettre par defaut "Utilisateur" en "Administrateur".
    
    email = models.EmailField(unique=True, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, unique=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    role = models.CharField(max_length=100, default='Administrateur')
    historique_activite = models.TextField(blank=True, null=True)
    biography = models.TextField(blank=True, null=True)
    avatar = models.ImageField(upload_to='users/avatar/', blank=True, null=True)
    last_name = models.CharField(max_length=128, blank=True, null=True)
    first_name = models.CharField(max_length=128, blank=True, null=True)
    department = models.CharField(max_length=128, blank=True, null=True)
    location = models.CharField(max_length=128, blank=True, null=True)
    status = models.CharField(max_length=128, blank=True, null=True)
    permissions = models.CharField(max_length=128, blank=True, null=True)
    temporaryPassword = models.BooleanField(default=False)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self):
        if self.username:
            return self.username
        return f"{self.first_name} {self.last_name}"

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = str(uuid.uuid4())[:10]
        if not self.password and self.temporaryPassword:
            temp_password = ''.join(
                secrets.choice(string.ascii_letters + string.digits) for _ in range(12)
            )
            self.set_password(temp_password)
        super().save(*args, **kwargs)


class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True


class Command(createsuperuser.Command):
    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument('--phone', dest='phone', default=None)
        parser.add_argument('--role', dest='role', default='Utilisateur')

    def handle(self, *args, **options):
        options.setdefault('phone', '')
        options.setdefault('role', 'Utilisateur')
        try:
            super().handle(*args, **options)
        except CommandError as e:
            self.stderr.write(str(e))
            
# ─── Role ────────────────────────────────────────────────────
class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    prioritylevel = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    dashboard_analytics = models.CharField(blank=True, null=True, max_length=255)
    inventory_management = models.CharField(blank=True, null=True, max_length=255)
    user_management = models.CharField(blank=True, null=True, max_length=255)
    ai_datamodels = models.CharField(blank=True, null=True, max_length=255)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Role'
        verbose_name_plural = 'Roles'
        ordering = ['name']