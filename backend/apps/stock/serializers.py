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
    """Serializer pour Inventaire avec relations imbriquées.
    
    Retourne:
    - produit_info: dict avec designation, product_mere (id, name, etc)
    - quantite_theo, quantite_phy, ecart: données d'inventaire
    """
    # Retourner les infos du ProduitDv sous le nom "produit_info"
    produit_info = serializers.SerializerMethodField()
    
    # Explicitement déclarer quantite_theo pour s'assurer qu'il est toujours retourné
    quantite_theo = serializers.SerializerMethodField()
    quantite_phy = serializers.SerializerMethodField()
    
    def get_quantite_theo(self, obj):
        """Retourner quantite_theo avec fallback sur produit.nombre si null."""
        if obj.quantite_theo:
            return obj.quantite_theo
        # Fallback: si quantite_theo est 0 ou null, essayer de récupérer depuis le produit
        if obj.produit and obj.produit.nombre:
            return int(obj.produit.nombre)
        return 0
    
    def get_quantite_phy(self, obj):
        """Retourner quantite_phy avec fallback."""
        return obj.quantite_phy if obj.quantite_phy is not None else 0
    
    def get_produit_info(self, obj):
        """Construire le dict produit_info attendu par le frontend."""
        if obj.produit:
            return {
                'id': obj.produit.id,
                'designation': obj.produit.designation,
                'product_mere': {
                    'id': obj.produit.product.id,
                    'name': obj.produit.product.name,
                    'category': obj.produit.product.category_id,
                    'unite_mesure': obj.produit.product.unite_mesure,
                } if obj.produit.product else None,
                'nombre': float(obj.produit.nombre or 0),
            }
        return None
    
    class Meta:
        model = Inventaire
        fields = ['id', 'produit', 'historique', 'quantite_theo', 'quantite_phy', 'ecart', 'produit_info']
        read_only_fields = ['id', 'ecart', 'produit_info', 'quantite_theo', 'quantite_phy']


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
    produit_name = serializers.ReadOnlyField(source='produit.name')
    produit_dv_name = serializers.ReadOnlyField(source='produit_dv.designation')
    
    def validate(self, data):
        movement_type = data.get("movement_type")
        quantity = data.get("quantity", 0)
        produit = data.get("produit")

        if movement_type in ["OUT", "SCRAP"] and produit:
            if quantity > produit.current_stock:
                raise serializers.ValidationError(
                    f"Stock insuffisant — disponible : {produit.current_stock}, demandé : {quantity}"
                )
        
        if quantity <= 0:
            raise serializers.ValidationError("La quantité doit être positive.")
        
        return data

    class Meta:
        model = MouvementStock
        fields = '__all__'
        read_only_fields = ['id', 'timestamp']