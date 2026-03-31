from django.contrib import admin
from .models import Activite, Alerte, Notification


@admin.register(Activite)
class ActiviteAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'date']
    search_fields = ['user__username', 'action']
    ordering = ['-date']


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