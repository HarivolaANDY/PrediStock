from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    HistoriqueInventaire, Inventaire,
    HistoriqueSeuilStock, MouvementStock,
)

User = get_user_model()


class HistoriqueInventaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoriqueInventaire
        fields = '__all__'


class InventaireSerializer(serializers.ModelSerializer):
    """
    Serializer pour Inventaire.

    produit_info retourne toujours un dict cohérent :

    Cas 1 — produit = ProduitDv (sous-produit connu)
      {
        id, designation, nombre,
        product_mere: { id, name, category, unite_mesure }
      }

    Cas 2 — produit = None + produit_cache renseigné (Product sans DV)
      {
        id: None, designation: None, nombre: 0,
        product_mere: { id: None, name: "<produit_cache>", ... }
      }

    Cas 3 — produit = None + produit_cache vide (ne devrait pas arriver)
      None
    """
    produit_info  = serializers.SerializerMethodField()
    quantite_theo = serializers.SerializerMethodField()
    quantite_phy  = serializers.SerializerMethodField()

    def get_quantite_theo(self, obj):
        if obj.quantite_theo:
            return obj.quantite_theo
        if obj.produit and obj.produit.nombre:
            return int(obj.produit.nombre)
        return 0

    def get_quantite_phy(self, obj):
        return obj.quantite_phy if obj.quantite_phy is not None else 0

    def get_produit_info(self, obj):
        # ── Cas 1 : ligne liée à un ProduitDv ────────────────────
        if obj.produit:
            return {
                'id':          obj.produit.id,
                'designation': obj.produit.designation,
                'nombre':      float(obj.produit.nombre or 0),
                'product_mere': {
                    'id':           obj.produit.product.id   if obj.produit.product else None,
                    'name':         obj.produit.product.name if obj.produit.product else None,
                    'category':     obj.produit.product.category_id if obj.produit.product else None,
                    'unite_mesure': obj.produit.product.unite_mesure if obj.produit.product else None,
                },
            }

        # ── Cas 2 : produit=None, nom stocké dans produit_cache ──
        if obj.produit_cache:
            return {
                'id':          None,
                'designation': None,   # pas de sous-produit → colonne "Produit Dv" affiche "—"
                'nombre':      0,
                'product_mere': {
                    'id':           None,
                    'name':         obj.produit_cache,
                    'category':     None,
                    'unite_mesure': None,
                },
            }

        # ── Cas 3 : rien du tout ──────────────────────────────────
        return None

    class Meta:
        model = Inventaire
        fields = [
            'id', 'produit', 'produit_cache', 'historique',
            'quantite_theo', 'quantite_phy', 'ecart', 'produit_info',
        ]
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
    utilisateur_info  = UserMinimalSerializer(source='utilisateur', read_only=True)
    produit_name      = serializers.ReadOnlyField(source='produit.name')
    produit_dv_name   = serializers.ReadOnlyField(source='produit_dv.designation')
    produit_display_name = serializers.SerializerMethodField()

    def get_produit_display_name(self, obj):
        """Retourne toujours un nom lisible, qu'il y ait une variante ou non."""
        # Priorité : variante > produit parent > fallback
        if obj.produit_dv:
            dv_name = obj.produit_dv.designation or ""
            parent_name = ""
            if obj.produit_dv.product:
                parent_name = obj.produit_dv.product.name or ""
            elif obj.produit:
                parent_name = obj.produit.name or ""
            if parent_name and dv_name and dv_name != parent_name:
                return f"{parent_name} — {dv_name}"
            return dv_name or parent_name or "Inconnu"
        if obj.produit:
            return obj.produit.name or "Inconnu"
        return "Inconnu"

    def validate(self, data):
        movement_type = data.get("movement_type")
        quantity      = data.get("quantity", 0)
        produit       = data.get("produit")

        if movement_type in ["OUT", "SCRAP"] and produit:
            if quantity > produit.current_stock:
                raise serializers.ValidationError(
                    f"Stock insuffisant — disponible : {produit.current_stock}, demandé : {quantity}"
                )

        if quantity <= 0:
            raise serializers.ValidationError("La quantité doit être positive.")

        return data

    class Meta:
        model  = MouvementStock
        fields = '__all__'
        read_only_fields = ['id', 'timestamp']