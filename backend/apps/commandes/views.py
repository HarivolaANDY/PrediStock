from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.views import GenericCRUDViewSet
from apps.core.utils import StandardResponse
from .models import BonCommande, ContenuDans, DonneeVente, ProduitDonneeVente, ProduitRenvoie
from .serializers import (
    BonCommandeSerializer, ContenuDansSerializer,
    DonneeVenteSerializer, ProduitDonneeVenteSerializer,
    ProduitRenvoieSerializer,
)
from .filters import BCfilter, ContenuDansFilter, DonneeVenteFilter, ProduitRenvoieFilter


class BCViewSet(viewsets.ModelViewSet):
    queryset = BonCommande.objects.all()
    serializer_class = BonCommandeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = BCfilter


class ContenuDansViewSet(GenericCRUDViewSet):
    model = ContenuDans
    queryset = ContenuDans.objects.all()
    serializer_class = ContenuDansSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = ContenuDansFilter


class DonneeVenteViewSet(viewsets.ModelViewSet):
    queryset = DonneeVente.objects.all().order_by('-date_vente')
    serializer_class = DonneeVenteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = DonneeVenteFilter

    @action(detail=False, methods=['delete'])
    def bulk_delete(self, request):
        qs = self.filter_queryset(self.get_queryset())
        qs.delete()
        return StandardResponse.render(message="Données de vente supprimées.", status_code=200)

    @action(detail=True, methods=['patch'])
    def update_fichier(self, request, pk=None):
        instance = self.get_object()
        if 'donne_supplementaire' not in request.FILES:
            return StandardResponse.render(message="Aucun fichier fourni.", status_code=400)
        if instance.donne_supplementaire:
            try:
                instance.donne_supplementaire.delete(save=False)
            except Exception as e:
                print(f"Erreur suppression ancien fichier : {e}")
        instance.donne_supplementaire = request.FILES['donne_supplementaire']
        instance.save()
        return StandardResponse.render(
            data=DonneeVenteSerializer(instance).data,
            message="Fichier mis à jour.",
            status_code=200
        )


class ProduitDonneeVenteViewSet(GenericCRUDViewSet):
    model = ProduitDonneeVente
    queryset = ProduitDonneeVente.objects.all()
    serializer_class = ProduitDonneeVenteSerializer


class ProduitRenvoieViewSet(viewsets.ModelViewSet):
    queryset = ProduitRenvoie.objects.all()
    serializer_class = ProduitRenvoieSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = ProduitRenvoieFilter

    @action(detail=False, methods=['get'])
    def get_by(self, request):
        param = request.query_params.get('param')
        value = request.query_params.get('value')
        if not param or not value:
            return StandardResponse.render(
                message="Paramètre ou valeur manquante.", status_code=400
            )
        try:
            qs = self.get_queryset().filter(**{param: value})
            return StandardResponse.render(
                data=ProduitRenvoieSerializer(qs, many=True).data,
                message="Renvois récupérés.", status_code=200
            )
        except Exception as e:
            return StandardResponse.render(message=f"Erreur : {e}", status_code=500)


class PurchaseSalesAnalyticsView(APIView):
    """Aggregated analytics: purchases vs sales with estimated margin."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        purchase_agg = BonCommande.objects.aggregate(
            total=Sum('montant_total'),
            count=Count('id')
        )
        sales_agg = DonneeVente.objects.aggregate(
            total=Sum('montant_total'),
            count=Count('id')
        )

        total_purchases = float(purchase_agg['total'] or 0)
        total_sales = float(sales_agg['total'] or 0)

        data = {
            'total_purchases': round(total_purchases, 2),
            'total_sales': round(total_sales, 2),
            'margin': round(total_sales - total_purchases, 2),
            'purchase_count': purchase_agg['count'] or 0,
            'sale_count': sales_agg['count'] or 0,
        }
        return Response({'success': True, 'data': data})