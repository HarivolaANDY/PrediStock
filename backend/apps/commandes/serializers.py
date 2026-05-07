from rest_framework import serializers
from .models import BonCommande, ContenuDans, DonneeVente, ProduitDonneeVente, ProduitRenvoie


class ContenuDansSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='produit.name')
    montant_ligne = serializers.ReadOnlyField()

    class Meta:
        model = ContenuDans
        fields = ['id', 'bon_commande', 'produit', 'product_name', 'recommandation', 'quantite', 'prix_unitaire', 'montant_ligne']

    def validate_quantite(self, value):
        if value <= 0:
            raise serializers.ValidationError("La quantité doit être supérieure à 0.")
        return value


class BonCommandeSerializer(serializers.ModelSerializer):
    lignes = ContenuDansSerializer(many=True, read_only=True)
    lignes_data = serializers.JSONField(write_only=True, required=False)
    fournisseur_name = serializers.ReadOnlyField(source='fournisseur.name')
    utilisateur_name = serializers.ReadOnlyField(source='utilisateur.username')
    
    class Meta:
        model = BonCommande
        fields = [
            'id', 'fournisseur', 'fournisseur_name', 'utilisateur', 'utilisateur_name',
            'numero_commande', 'status', 'montant_total', 'date_commande', 
            'livraison_prevue', 'livraison_actuelle', 'lignes', 'lignes_data',
            'creer_le', 'update_at'
        ]

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes_data', [])
        # Auto-generate numero_commande if default
        if validated_data.get('numero_commande') == 'BC-000000000':
            import uuid
            validated_data['numero_commande'] = f"BC-{str(uuid.uuid4())[:8].upper()}"
        
        bon = BonCommande.objects.create(**validated_data)
        
        total = 0
        for ligne in lignes_data:
            quantite = ligne.get('quantite', 1)
            prix = ligne.get('prix_unitaire', 0)
            ContenuDans.objects.create(
                bon_commande=bon,
                produit_id=ligne.get('produit'),
                quantite=quantite,
                prix_unitaire=prix
            )
            total += (quantite * prix)
        
        if total > 0:
            bon.montant_total = total
            bon.save()
            
        return bon


class ProduitDonneeVenteSerializer(serializers.ModelSerializer):
    produit_name = serializers.ReadOnlyField(source='produit.name')
    montant_ligne = serializers.ReadOnlyField()

    class Meta:
        model = ProduitDonneeVente
        fields = ['id', 'donnee_vente', 'produit', 'produit_name', 'quantite', 'prix_unitaire', 'remise_applique', 'montant_ligne']


class DonneeVenteSerializer(serializers.ModelSerializer):
    lignes = ProduitDonneeVenteSerializer(many=True, read_only=True)
    lignes_data = serializers.JSONField(write_only=True, required=False)
    utilisateur_name = serializers.ReadOnlyField(source='utilisateur.username')

    class Meta:
        model = DonneeVente
        fields = [
            'id', 'utilisateur', 'utilisateur_name', 'numero_vente', 
            'montant_total', 'remise_globale', 'canal_vente', 
            'segment_clientele', 'date_vente', 'lignes', 'lignes_data',
            'creer_le', 'update_at'
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
            ProduitDonneeVente.objects.create(
                donnee_vente=vente,
                produit_id=ligne.get('produit'),
                quantite=quantite,
                prix_unitaire=prix,
                remise_applique=remise
            )
            total += (quantite * prix) - remise
            
        if total > 0:
            vente.montant_total = total
            vente.save()
            
        return vente


class ProduitRenvoieSerializer(serializers.ModelSerializer):
    produit_name = serializers.ReadOnlyField(source='produit.name')
    
    class Meta:
        model = ProduitRenvoie
        fields = '__all__'