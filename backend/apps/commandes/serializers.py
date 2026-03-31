from rest_framework import serializers
from .models import BonCommande, ContenuDans, DonneeVente, ProduitDonneeVente, ProduitRenvoie


class BonCommandeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BonCommande
        fields = '__all__'


class ContenuDansSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContenuDans
        fields = '__all__'


class DonneeVenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DonneeVente
        fields = '__all__'


class ProduitDonneeVenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProduitDonneeVente
        fields = '__all__'


class ProduitRenvoieSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProduitRenvoie
        fields = '__all__'