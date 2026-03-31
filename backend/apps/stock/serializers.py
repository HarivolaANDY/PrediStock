from rest_framework import serializers
from django.contrib.auth import get_user_model
# from .models import (Effectuer, VerificationStock,)
from .models import (
    HistoriqueInventaire, Inventaire,
    HistoriqueSeuilStock, MouvementStock,
)

User = get_user_model()


# class EffectuerSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Effectuer
#         fields = '__all__'


# class VerificationStockSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = VerificationStock
#         fields = '__all__'


class HistoriqueInventaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoriqueInventaire
        fields = '__all__'


class InventaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inventaire
        fields = '__all__'


class HistoriqueSeuilStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoriqueSeuilStock
        fields = '__all__'

    def validate(self, attrs):
        if attrs.get('ancien_seuil') == attrs.get('nouveau_seuil'):
            raise serializers.ValidationError(
                "L'ancien et le nouveau seuil doivent être différents."
            )
        return attrs


class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['last_name', 'first_name', 'username']


class MouvementStockSerializer(serializers.ModelSerializer):
    utilisateur_info = UserMinimalSerializer(source='utilisateur', read_only=True)

    class Meta:
        model = MouvementStock
        fields = '__all__'
        read_only_fields = ['id', 'timestamp']