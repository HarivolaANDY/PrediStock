from rest_framework import serializers
from .models import Alerte, Notification
from django.contrib.auth import get_user_model

User = get_user_model()


class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']





class AlerteSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='produit.name', read_only=True)
    product_sku = serializers.CharField(source='produit.sku', read_only=True)

    class Meta:
        model = Alerte
        fields = [
            'id', 'produit', 'product_name', 'product_sku',
            'type_alert', 'priorite', 'message', 'compteur',
            'est_lu', 'est_resolu', 'creer_le', 'resolu_le',
        ]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('id', 'creer_le')