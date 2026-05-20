from rest_framework import serializers
from .models import BonCommande, ContenuDans, DonneeVente, ProduitDonneeVente, Remboursement
from apps.catalogue.models import ProduitDv


class ContenuDansSerializer(serializers.ModelSerializer):
    produit_name = serializers.SerializerMethodField()
    produit_dv_name = serializers.SerializerMethodField()

    def get_produit_name(self, obj):
        return obj.produit.name if obj.produit else "N/A"
    
    def get_produit_dv_name(self, obj):
        return obj.produit_dv.designation if obj.produit_dv else "N/A"

    montant_ligne = serializers.ReadOnlyField()
    product_name = serializers.ReadOnlyField(source='produit.name')

    class Meta:
        model = ContenuDans
        fields = [
            'id', 'bon_commande', 'produit', 'produit_dv', 'product_name', 'produit_name', 
            'produit_dv_name', 'quantite', 'prix_unitaire', 'montant_ligne'
        ]

    def validate_quantite(self, value):
        if value <= 0:
            raise serializers.ValidationError("La quantité doit être supérieure à 0.")
        return value


class BonCommandeSerializer(serializers.ModelSerializer):
    lignes = ContenuDansSerializer(many=True, read_only=True)
    lignes_data = serializers.JSONField(write_only=True, required=False)
    fournisseur_name = serializers.ReadOnlyField(source='fournisseur.name')
    utilisateur_name = serializers.SerializerMethodField()

    def get_utilisateur_name(self, obj):
        if not obj.utilisateur: return "Système"
        full_name = f"{obj.utilisateur.first_name} {obj.utilisateur.last_name}".strip()
        return full_name if full_name else obj.utilisateur.username
    
    class Meta:
        model = BonCommande
        fields = [
            'id', 'fournisseur', 'fournisseur_name', 'utilisateur', 'utilisateur_name',
            'numero_commande', 'status', 'statut_paiement', 'mode_paiement', 'montant_total', 'montant_paye',
            'date_commande', 'livraison_prevue', 'livraison_actuelle', 'lignes', 'lignes_data',
            'creer_le', 'update_at'
        ]

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes_data', [])
        
        # Auto-generate numero_commande if default or empty
        if not validated_data.get('numero_commande') or validated_data.get('numero_commande') == 'BC-000000000':
            # Note: We can let the model handle this in save or use a better gen here
            pass

        bon = BonCommande.objects.create(**validated_data)

        total = 0
        for ligne in lignes_data:
            quantite = ligne.get('quantite', 1)
            prix = ligne.get('prix_unitaire', 0)
            p_id = ligne.get('produit')
            dv_id = ligne.get('produit_dv')
            
            # Auto-fill parent if missing
            if not p_id and dv_id:
                dv_obj = ProduitDv.objects.filter(id=dv_id).first()
                if dv_obj and dv_obj.product:
                    p_id = dv_obj.product.id

            ContenuDans.objects.create(
                bon_commande=bon,
                produit_id=p_id,
                produit_dv_id=dv_id,
                quantite=quantite,
                prix_unitaire=prix
            )
            total += (quantite * prix)
        
        if total > 0:
            bon.montant_total = total
            bon.save()
            
        return bon


class ProduitDonneeVenteSerializer(serializers.ModelSerializer):
    produit_name = serializers.SerializerMethodField()
    produit_dv_name = serializers.SerializerMethodField()

    def get_produit_name(self, obj):
        return obj.produit.name if obj.produit else "N/A"
    
    def get_produit_dv_name(self, obj):
        return obj.produit_dv.designation if obj.produit_dv else "N/A"

    montant_ligne = serializers.ReadOnlyField()
    product_name = serializers.ReadOnlyField(source='produit.name')

    class Meta:
        model = ProduitDonneeVente
        fields = [
            'id', 'donnee_vente', 'produit', 'produit_dv', 'produit_name', 'product_name',
            'produit_dv_name', 'quantite', 'prix_unitaire', 'remise_applique', 'montant_ligne'
        ]


class RemboursementSerializer(serializers.ModelSerializer):
    produit_name = serializers.ReadOnlyField(source='produit.name')

    class Meta:
        model = Remboursement
        fields = [
            'id', 'source_type', 'source_id', 'numero_transaction', 'produit', 
            'produit_name', 'quantite', 'montant', 'raison', 'date_remboursement', 
            'statut_reglement', 'notes'
        ]


class DonneeVenteSerializer(serializers.ModelSerializer):
    lignes = ProduitDonneeVenteSerializer(many=True, read_only=True)
    lignes_data = serializers.JSONField(write_only=True, required=False)
    utilisateur_name = serializers.SerializerMethodField()

    def get_utilisateur_name(self, obj):
        if not obj.utilisateur: return "Système"
        full_name = f"{obj.utilisateur.first_name} {obj.utilisateur.last_name}".strip()
        return full_name if full_name else obj.utilisateur.username

    class Meta:
        model = DonneeVente
        fields = [
            'id', 'utilisateur', 'utilisateur_name', 'numero_vente', 
            'montant_total', 'montant_paye', 'remise_globale', 'statut_paiement', 
            'mode_paiement', 'segment_clientele', 'status', 'type_vente',
            'date_vente', 'delai_paiement', 'lignes', 'lignes_data', 'creer_le', 'update_at'
        ]

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes_data', [])
        
        # Auto-generate numero_vente
        if not validated_data.get('numero_vente'):
            import uuid
            validated_data['numero_vente'] = f"VT-{str(uuid.uuid4())[:8].upper()}"
            
        vente = DonneeVente.objects.create(**validated_data)
        
        total = 0
        for ligne in lignes_data:
            quantite = ligne.get('quantite', 1)
            prix = ligne.get('prix_unitaire', 0)
            remise = ligne.get('remise_applique', 0)
            p_id = ligne.get('produit')
            dv_id = ligne.get('produit_dv')
            
            # Auto-fill parent if missing
            if not p_id and dv_id:
                dv_obj = ProduitDv.objects.filter(id=dv_id).first()
                if dv_obj and dv_obj.product:
                    p_id = dv_obj.product.id

            # VALIDATION STOCK
            if dv_id:
                dv_obj = ProduitDv.objects.get(id=dv_id)
                if float(dv_obj.nombre) < float(quantite):
                    vente.delete() # Annuler la création de l'entête
                    raise serializers.ValidationError(f"Stock insuffisant pour {dv_obj.designation} (Disponible: {dv_obj.nombre}, Demandé: {quantite})")
            elif p_id:
                from apps.catalogue.models import Product
                p_obj = Product.objects.get(id=p_id)
                if float(p_obj.current_stock) < float(quantite):
                    vente.delete()
                    raise serializers.ValidationError(f"Stock insuffisant pour {p_obj.name} (Disponible: {p_obj.current_stock}, Demandé: {quantite})")

            ProduitDonneeVente.objects.create(
                donnee_vente=vente,
                produit_id=p_id,
                produit_dv_id=dv_id,
                quantite=quantite,
                prix_unitaire=prix,
                remise_applique=remise
            )
            total += (quantite * prix) - remise
            
        if total > 0:
            vente.montant_total = total
            vente.save()
            
        return vente