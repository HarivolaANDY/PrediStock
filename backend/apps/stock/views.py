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
        new_histo = HistoriqueInventaire.objects.create(utilisateur=request.user)
        for inv in Inventaire.objects.filter(historique=histo_id):
            inv.redresser(new_histo)
        return StandardResponse.render(message='Redressement effectué.', status_code=200)


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


# ─── MouvementStock ─────────────────────────────────────────
class MouvementStockViewSet(GenericCRUDViewSet):
    model = MouvementStock
    queryset = MouvementStock.objects.select_related('produit', 'utilisateur').all()
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
        serializer.save(utilisateur=self.request.user)

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