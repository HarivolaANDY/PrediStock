from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Sum
from django.db.models.functions import TruncDay, TruncMonth, TruncYear
from django_filters.rest_framework import DjangoFilterBackend
from datetime import date

from apps.core.views import GenericCRUDViewSet
from apps.core.utils import StandardResponse

from .models import (
    HistoriqueInventaire, Inventaire,
    HistoriqueSeuilStock, MouvementStock,
)
from .serializers import (
    HistoriqueInventaireSerializer, InventaireSerializer,
    HistoriqueSeuilStockSerializer, MouvementStockSerializer,
)
from .filters import (
    MouvementStockFilter, HistoriqueSeuilStockFilter,
)


# ─── HistoriqueInventaire ────────────────────────────────────
class HistoriqueInventaireViewSet(GenericCRUDViewSet):
    model = HistoriqueInventaire
    queryset = HistoriqueInventaire.objects.all()
    serializer_class = HistoriqueInventaireSerializer
    permission_classes = [IsAuthenticated]


# ─── Inventaire ─────────────────────────────────────────────
class InventaireViewSet(GenericCRUDViewSet):
    model = Inventaire
    queryset = Inventaire.objects.select_related('produit').all()
    serializer_class = InventaireSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def par_historique(self, request):
        histo_id = request.query_params.get('historique')
        if not histo_id:
            dernier = HistoriqueInventaire.objects.last()
            histo_id = dernier.id if dernier else None
        queryset = self.get_queryset().filter(historique=histo_id)
        return StandardResponse.render(
            data=InventaireSerializer(queryset, many=True).data,
            message="Inventaire récupéré par historique",
            status_code=200
        )

    @action(detail=False, methods=['post'])
    def lancer(self, request):
        description = request.data.get('description', 'Inventaire du mois')
        histo = Inventaire.lancer_inventaire(user=request.user, description=description)
        return StandardResponse.render(
            data=HistoriqueInventaireSerializer(histo).data,
            message="Inventaire lancé avec succès",
            status_code=201
        )

    @action(detail=False, methods=['post'])
    def calculer_ecarts(self, request):
        histo_id = request.data.get('historique')
        for inv in Inventaire.objects.filter(historique=histo_id):
            inv.calculer_ecart()
        return StandardResponse.render(message='Écarts calculés.', status_code=200)

    @action(detail=False, methods=['post'])
    def redresser(self, request):
        histo_id = request.data.get('historique')
        try:
            old_histo = HistoriqueInventaire.objects.get(id=histo_id)
        except HistoriqueInventaire.DoesNotExist:
            return StandardResponse.render(message='Historique introuvable.', status_code=404)

        if old_histo.etat:
            return StandardResponse.render(message='Cet inventaire est déjà redressé.', status_code=400)
        
        for inv in Inventaire.objects.filter(historique=old_histo):
            inv.redresser(request.user)
        
        # Marquer l'inventaire comme terminé
        old_histo.etat = True
        old_histo.save(update_fields=['etat'])

        return StandardResponse.render(message='Redressement effectué.', status_code=200)

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        """
        Met à jour plusieurs lignes d'inventaire d'un coup.
        Format attendu : {'items': [{'id': 1, 'quantite_phy': 10}, ...]}
        """
        items = request.data.get('items', [])
        updated_count = 0
        for item in items:
            inv_id = item.get('id')
            qte_phy = item.get('quantite_phy')
            if inv_id is not None and qte_phy is not None:
                Inventaire.objects.filter(id=inv_id).update(quantite_phy=qte_phy)
                updated_count += 1
        return StandardResponse.render(
            message=f"{updated_count} lignes d'inventaire mises à jour.",
            status_code=200
        )


# ─── HistoriqueSeuilStock ────────────────────────────────────
class HistoriqueSeuilStockViewSet(GenericCRUDViewSet):
    model = HistoriqueSeuilStock
    queryset = HistoriqueSeuilStock.objects.select_related('produit', 'utilisateur').all()
    serializer_class = HistoriqueSeuilStockSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = HistoriqueSeuilStockFilter

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)

    def perform_update(self, serializer):
        serializer.save(utilisateur=self.request.user)


# ─── MouvementStock ─────────────────────────────────
class MouvementStockViewSet(GenericCRUDViewSet):
    model = MouvementStock
    queryset = MouvementStock.objects.select_related(
        'produit', 'produit_dv', 'produit_dv__product', 'utilisateur'
    ).all()
    serializer_class = MouvementStockSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = MouvementStockFilter

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(movement_type__icontains=search) |
                Q(reason__icontains=search) |
                Q(notes__icontains=search) |
                Q(produit__name__icontains=search) |
                Q(utilisateur__email__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        """Accepte id_product (legacy) et id_produit_dv en plus des FKs DRF standard."""
        from apps.catalogue.models import Product, ProduitDv

        data = self.request.data

        # Mapper id_product → produit si non fourni directement
        produit = serializer.validated_data.get('produit')
        if produit is None:
            id_product = data.get('id_product') or data.get('produit')
            if id_product:
                try:
                    produit = Product.objects.get(id=int(id_product))
                except (Product.DoesNotExist, ValueError, TypeError):
                    produit = None

        # Mapper id_produit_dv → produit_dv si fourni
        produit_dv = serializer.validated_data.get('produit_dv')
        if produit_dv is None:
            id_dv = data.get('id_produit_dv') or data.get('produit_dv')
            if id_dv:
                try:
                    produit_dv = ProduitDv.objects.get(id=int(id_dv))
                    # Résoudre le parent si absent
                    if produit is None and produit_dv.product:
                        produit = produit_dv.product
                except (ProduitDv.DoesNotExist, ValueError, TypeError):
                    produit_dv = None

        serializer.save(
            utilisateur=self.request.user,
            produit=produit,
            produit_dv=produit_dv,
        )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = MouvementStock.objects.count()
        entrees = MouvementStock.objects.filter(movement_type='IN').count()
        sorties = MouvementStock.objects.filter(movement_type='OUT').count()
        ajustements = MouvementStock.objects.filter(movement_type='ADJUSTMENT').count()
        return StandardResponse.render(
            data={
                'total': total,
                'entrees': entrees,
                'sorties': sorties,
                'ajustements': ajustements,
                'autres': total - (entrees + sorties + ajustements),
            },
            message="Statistiques récupérées avec succès",
            status_code=200
        )

    @action(detail=False, methods=['get'])
    def chart(self, request):
        time_range = request.GET.get("range", "month")

        if time_range == "day":
            trunc = TruncDay("timestamp")
        elif time_range == "year":
            trunc = TruncYear("timestamp")
        else:
            trunc = TruncMonth("timestamp")

        qs = self.get_queryset().filter(timestamp__isnull=False)

        data = (
            qs.annotate(period=trunc)
            .values("period", "movement_type")
            .annotate(total=Sum("quantity"))
            .order_by("period")
        )

        result = {}
        for item in data:
            period = item.get("period")
            if not period:
                continue

            if time_range == "day":
                key = period.strftime("%d/%m/%Y")
            elif time_range == "year":
                key = period.strftime("%Y")
            else:
                key = period.strftime("%b %Y")

            if key not in result:
                result[key] = {"inbound": 0, "outbound": 0, "net": 0}

            if item["movement_type"] in ("IN", "RETURN"):
                result[key]["inbound"] += item["total"] or 0
            elif item["movement_type"] in ("OUT", "SCRAP"):
                result[key]["outbound"] += item["total"] or 0

        for k in result:
            result[k]["net"] = result[k]["inbound"] - result[k]["outbound"]

        return StandardResponse.render(
            data=[{"period": k, **v} for k, v in sorted(result.items())],
            message="Données du graphique",
            status_code=200
        )
        
    @action(detail=False, methods=['get'])
    def chart_by_category(self, request):
        """
        Retourne les entrées et sorties totales par catégorie de produit.
        Réponse : [{ category: "Nom", inbound: N, outbound: N, net: N, stock: N }, ...]
        """
        qs = (
            self.get_queryset()
            .filter(produit__isnull=False, produit__category__isnull=False)
            .values("produit__category__id", "produit__category__name", "movement_type")
            .annotate(total=Sum("quantity"))
            .order_by("produit__category__name")
        )

        result: dict[int, dict] = {}
        for item in qs:
            cid = item["produit__category__id"]
            cname = item["produit__category__name"] or f"Catégorie #{cid}"
            if cid not in result:
                result[cid] = {"category": cname, "inbound": 0, "outbound": 0, "net": 0}

            if item["movement_type"] in ("IN", "RETURN"):
                result[cid]["inbound"] += item["total"] or 0
            elif item["movement_type"] in ("OUT", "SCRAP"):
                result[cid]["outbound"] += item["total"] or 0

        for cid in result:
            result[cid]["net"] = result[cid]["inbound"] - result[cid]["outbound"]
            result[cid]["stock"] = result[cid]["net"]  # alias pour le BarChart existant

        sorted_data = sorted(result.values(), key=lambda x: x["inbound"] + x["outbound"], reverse=True)

        return StandardResponse.render(
            data=sorted_data,
            message="Entrées/sorties par catégorie",
            status_code=200
        )

    # ── NOUVEAU : entrées/sorties agrégées par produit ───────────────────────
    @action(detail=False, methods=['get'])
    def chart_by_product(self, request):
        """
        Retourne les entrées et sorties totales par produit.
        Paramètres optionnels :
          - limit : nb de produits à retourner (défaut 20, trié par total mouvementé)
          - movement_type : 'IN', 'OUT' ou vide (tous)
        Réponse : [{ product: "Nom", inbound: N, outbound: N, net: N }, ...]
        """
        limit = int(request.GET.get("limit", 20))

        qs = (
            self.get_queryset()
            .filter(produit__isnull=False)
            .values("produit__id", "produit__name", "movement_type")
            .annotate(total=Sum("quantity"))
            .order_by("produit__name")
        )

        # Agréger par produit
        result: dict[int, dict] = {}
        for item in qs:
            pid = item["produit__id"]
            pname = item["produit__name"] or f"Produit #{pid}"
            if pid not in result:
                result[pid] = {"product": pname, "inbound": 0, "outbound": 0, "net": 0}

            if item["movement_type"] in ("IN", "RETURN"):
                result[pid]["inbound"] += item["total"] or 0
            elif item["movement_type"] in ("OUT", "SCRAP"):
                result[pid]["outbound"] += item["total"] or 0

        for pid in result:
            result[pid]["net"] = result[pid]["inbound"] - result[pid]["outbound"]

        # Trier par total mouvementé (inbound + outbound) décroissant, limiter
        sorted_data = sorted(
            result.values(),
            key=lambda x: x["inbound"] + x["outbound"],
            reverse=True
        )[:limit]

        return StandardResponse.render(
            data=sorted_data,
            message="Entrées/sorties par produit",
            status_code=200
        )
        
    @action(detail=True, methods=['post'])
    def annuler(self, request, pk=None):
        mouvement = self.get_object()
        
        if hasattr(mouvement, 'annulation'):
            return StandardResponse.render(
                message="Ce mouvement est déjà annulé.", status_code=400
            )
        
        # Créer le mouvement inverse
        inverse_type = {
            "IN": "OUT", "OUT": "IN",
            "RETURN": "SCRAP", "SCRAP": "RETURN",
            "ADJUSTMENT": "ADJUSTMENT"
        }.get(mouvement.movement_type, "ADJUSTMENT")

        MouvementStock.objects.create(
            produit=mouvement.produit,
            produit_dv=mouvement.produit_dv,
            quantity=mouvement.quantity if inverse_type != "ADJUSTMENT" else -mouvement.quantity,
            movement_type=inverse_type,
            utilisateur=request.user,
            reason=f"Annulation du mouvement #{mouvement.id}",
            referrence=mouvement.referrence,
        )
        
        return StandardResponse.render(
            message=f"Mouvement #{mouvement.id} annulé.", status_code=200
        )