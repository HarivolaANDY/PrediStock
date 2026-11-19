from django.db import transaction
from django.utils import timezone
from rest_framework import exceptions, serializers
from .models import (
    BonCommande, ContenuDans, DonneeVente, ProduitDonneeVente, Remboursement, TransactionPaiement,
)
from apps.catalogue.models import ProduitDv


class RegleMetierError(exceptions.APIException):
    """
    Règle métier non respectée → HTTP 400 avec `{"detail": "<message>"}` (message en CHAÎNE, comme
    les autres erreurs d'API, directement affichable par le frontend). `serializers.ValidationError`
    ne convient pas ici : DRF enveloppe ses messages dans des listes.
    """
    status_code = 400
    default_code = 'regle_metier'


def verifier_lignes_a_la_creation(lignes_data, message_vide):
    """
    Règle « pas de document vide », imposée par le serveur (l'écran la contrôle déjà) : un achat
    ou une vente créé sans aucune ligne n'a ni total ni sens métier.
    """
    if not isinstance(lignes_data, list) or not lignes_data:
        raise RegleMetierError(message_vide)
    if not all(isinstance(ligne, dict) for ligne in lignes_data):
        raise RegleMetierError("Les lignes sont mal formées.")


def verifier_lignes_uniques(lignes_data):
    """
    Règle « une seule ligne par produit » : un produit simple ne figure qu'une fois dans le
    document (on modifie la quantité de la ligne existante). Un produit à variantes peut figurer
    plusieurs fois, mais une même variante une seule fois.
    """
    vues = set()
    for ligne in lignes_data:
        if ligne.get('produit_dv'):
            cle = ('dv', str(ligne['produit_dv']))
        elif ligne.get('produit'):
            cle = ('produit', str(ligne['produit']))
        else:
            continue
        if cle in vues:
            raise RegleMetierError(
                "Un même produit ne peut figurer qu'une seule fois : "
                "augmentez la quantité de la ligne existante plutôt que d'en ajouter une autre."
            )
        vues.add(cle)


class TransactionPaiementSerializer(serializers.ModelSerializer):
    """Une ligne de l'historique des paiements (lecture seule)."""
    class Meta:
        model = TransactionPaiement
        fields = ['id', 'montant', 'mode_paiement', 'date_paiement', 'notes']
        read_only_fields = fields


class ContenuDansSerializer(serializers.ModelSerializer):
    produit_name = serializers.SerializerMethodField()
    produit_dv_name = serializers.SerializerMethodField()
    lot_numero = serializers.SerializerMethodField()

    def get_produit_name(self, obj):
        return obj.produit.name if obj.produit else "N/A"

    def get_produit_dv_name(self, obj):
        return obj.produit_dv.designation if obj.produit_dv else "N/A"

    def get_lot_numero(self, obj):
        """Numéro du lot créé à la livraison de cette ligne (None tant qu'elle n'est pas livrée)."""
        return obj.lot.numero_lot if obj.lot_id else None

    montant_ligne = serializers.ReadOnlyField()
    product_name = serializers.ReadOnlyField(source='produit.name')

    class Meta:
        model = ContenuDans
        fields = [
            'id', 'bon_commande', 'produit', 'produit_dv', 'product_name', 'produit_name',
            'produit_dv_name', 'quantite', 'prix_unitaire', 'montant_ligne', 'lot_numero'
        ]

    def validate_quantite(self, value):
        if value <= 0:
            raise serializers.ValidationError("La quantité doit être supérieure à 0.")
        return value


class BonCommandeSerializer(serializers.ModelSerializer):
    lignes = ContenuDansSerializer(many=True, read_only=True)
    paiements = TransactionPaiementSerializer(many=True, read_only=True)
    lignes_data = serializers.JSONField(write_only=True, required=False)
    fournisseur_name = serializers.ReadOnlyField(source='fournisseur.name')
    utilisateur_name = serializers.SerializerMethodField()
    supprimable = serializers.SerializerMethodField()

    def get_utilisateur_name(self, obj):
        if not obj.utilisateur: return "Système"
        full_name = f"{obj.utilisateur.first_name} {obj.utilisateur.last_name}".strip()
        return full_name if full_name else obj.utilisateur.username

    def get_supprimable(self, obj):
        """False si la commande a laissé des traces (paiement, livraison, remboursement) : on l'annule."""
        return obj.motif_non_supprimable() is None
    
    class Meta:
        model = BonCommande
        fields = [
            'id', 'fournisseur', 'fournisseur_name', 'utilisateur', 'utilisateur_name',
            'numero_commande', 'status', 'statut_paiement', 'mode_paiement', 'montant_total', 'montant_paye',
            'date_commande', 'livraison_prevue', 'livraison_actuelle', 'lignes', 'lignes_data',
            'paiements', 'creer_le', 'update_at', 'supprimable'
        ]

    def validate(self, attrs):
        if self.instance is None:
            verifier_lignes_a_la_creation(
                attrs.get('lignes_data'), "Une commande doit contenir au moins une ligne."
            )
        return attrs

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

    def validate(self, attrs):
        """
        Un produit simple ne figure qu'une fois dans une vente. Pour une variante, la contrainte
        d'unicité du modèle suffit ; sans variante, elle ne s'applique pas (en SQL, deux NULL
        sont toujours « différents »), d'où ce contrôle.
        """
        instance = self.instance
        vente = attrs.get('donnee_vente', getattr(instance, 'donnee_vente', None))
        produit = attrs.get('produit', getattr(instance, 'produit', None))
        variante = attrs.get('produit_dv', getattr(instance, 'produit_dv', None))
        if vente is not None and produit is not None and variante is None:
            doublons = ProduitDonneeVente.objects.filter(
                donnee_vente=vente, produit=produit, produit_dv__isnull=True
            )
            if instance is not None:
                doublons = doublons.exclude(pk=instance.pk)
            if doublons.exists():
                raise RegleMetierError(
                    f"« {produit.name} » figure déjà dans cette vente : "
                    "augmentez la quantité de la ligne existante plutôt que d'en ajouter une autre."
                )
        return attrs


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
    paiements = TransactionPaiementSerializer(many=True, read_only=True)
    lignes_data = serializers.JSONField(write_only=True, required=False)
    utilisateur_name = serializers.SerializerMethodField()
    supprimable = serializers.SerializerMethodField()

    def get_utilisateur_name(self, obj):
        if not obj.utilisateur: return "Système"
        full_name = f"{obj.utilisateur.first_name} {obj.utilisateur.last_name}".strip()
        return full_name if full_name else obj.utilisateur.username

    def get_supprimable(self, obj):
        """False si la vente a laissé des traces (paiement, livraison, remboursement) : on l'annule."""
        return obj.motif_non_supprimable() is None

    class Meta:
        model = DonneeVente
        fields = [
            'id', 'utilisateur', 'utilisateur_name', 'numero_vente', 
            'montant_total', 'montant_paye', 'remise_globale', 'statut_paiement', 
            'mode_paiement', 'segment_clientele', 'status', 'type_vente',
            'date_vente', 'delai_paiement', 'lignes', 'lignes_data', 'paiements', 'creer_le', 'update_at',
            'supprimable'
        ]

    def validate(self, attrs):
        """
        Règle de la vente à crédit, appliquée AUSSI côté serveur (le frontend la contrôle déjà) :
        réservée au segment « VIP/Fidélisé », avec un délai de paiement futur.

        Elle est vérifiée à la création, et quand la DÉFINITION du crédit change (type, segment ou
        délai dans la requête) en tenant compte de l'état existant. Un simple changement de statut
        ou de paiement sur une vente à crédit déjà enregistrée n'est pas bloqué.
        """
        instance = self.instance
        if instance is None:
            lignes_data = attrs.get('lignes_data')
            verifier_lignes_a_la_creation(lignes_data, "Une vente doit contenir au moins une ligne.")
            verifier_lignes_uniques(lignes_data)
        definition_modifiee = instance is None or any(
            champ in attrs for champ in ('type_vente', 'segment_clientele', 'delai_paiement')
        )
        if not definition_modifiee:
            return attrs

        def valeur(champ, defaut):
            return attrs[champ] if champ in attrs else getattr(instance, champ, defaut)

        if valeur('type_vente', DonneeVente.TypeVente.NORMAL) != DonneeVente.TypeVente.CREDIT:
            return attrs

        if valeur('segment_clientele', '') != DonneeVente.SEGMENT_CREDIT:
            raise RegleMetierError("La vente à crédit est réservée aux clients VIP/Fidélisés.")
        delai = valeur('delai_paiement', None)
        if not delai:
            raise RegleMetierError("Veuillez préciser un délai de paiement pour la vente à crédit.")
        if ('delai_paiement' in attrs or instance is None) and delai <= timezone.now():
            raise RegleMetierError("Le délai de paiement d'une vente à crédit doit être dans le futur.")
        return attrs

    def create(self, validated_data):
        # Tout ou rien : une ligne en rupture de stock annule la vente entière, y compris les
        # mouvements de stock déjà créés pour les lignes précédentes d'une vente créée « Livrée ».
        with transaction.atomic():
            return self._creer_vente(validated_data)

    def _creer_vente(self, validated_data):
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
                    raise RegleMetierError(
                        f"Stock insuffisant pour {dv_obj.designation} (Disponible: {dv_obj.nombre}, Demandé: {quantite})"
                    )
            elif p_id:
                from apps.catalogue.models import Product
                p_obj = Product.objects.get(id=p_id)
                if float(p_obj.current_stock) < float(quantite):
                    raise RegleMetierError(
                        f"Stock insuffisant pour {p_obj.name} (Disponible: {p_obj.current_stock}, Demandé: {quantite})"
                    )

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