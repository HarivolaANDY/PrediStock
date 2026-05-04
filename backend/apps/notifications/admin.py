from django.contrib import admin
from .models import Alerte, Notification
<<<<<<< HEAD



=======
>>>>>>> d6af1f17c084ea42418aebbcec62eea48818ea0e


@admin.register(Alerte)
class AlerteAdmin(admin.ModelAdmin):
    list_display = ['type_alert', 'produit', 'priorite',
                    'compteur', 'est_lu', 'est_resolu', 'creer_le']
    list_filter = ['priorite', 'est_lu', 'est_resolu']
    search_fields = ['type_alert', 'produit__name']
    ordering = ['-creer_le']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['titre', 'utilisateur', 'channel', 'status', 'priorite', 'creer_le']
    list_filter = ['channel', 'status', 'type_notification']
    search_fields = ['titre', 'utilisateur__username']
    ordering = ['-creer_le']