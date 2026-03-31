from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.views import GenericCRUDViewSet
from apps.core.utils import StandardResponse
#from .models import Effectuer
#from .models import VerificationStock,
#from .serializers import (EffectuerSerializer, VerificationStockSerializer,)
#from .filters import (    EffectuerFilter, VerificationStockFilter,)

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


# ─── Effectuer ──────────────────────────────────────────────
# class EffectuerViewSet(GenericCRUDViewSet):
#     model = Effectuer
#     queryset = Effectuer.objects.all()
#     serializer_class = EffectuerSerializer
#     filter_backends = [DjangoFilterBackend]
#     filterset_class = EffectuerFilter


# ─── VerificationStock ──────────────────────────────────────
# class VerificationStockViewSet(viewsets.ModelViewSet):
#     queryset = VerificationStock.objects.all()
#     serializer_class = VerificationStockSerializer
#     filter_backends = [DjangoFilterBackend]
#     filterset_class = VerificationStockFilter

#     def list(self, request, *args, **kwargs):
#         queryset = self.filter_queryset(self.get_queryset())
#         serializer = self.get_serializer(queryset, many=True)
#         return StandardResponse.render(
#             data=serializer.data,
#             message="Liste des vérifications de stock",
#             status_code=200
#         )

#     def retrieve(self, request, *args, **kwargs):
#         instance = self.get_object()
#         return StandardResponse.render(
#             data=self.get_serializer(instance).data,
#             message="Détails de la vérification de stock",
#             status_code=200
#         )

#     def destroy(self, request, *args, **kwargs):
#         self.get_object().delete()
#         return StandardResponse.render(
#             data=None,
#             message="Vérification de stock supprimée avec succès",
#             status_code=200
#         )

#     @action(detail=False, methods=['get'])
#     def get_by(self, request):
#         param = request.query_params.get('param')
#         value = request.query_params.get('value')
#         if not param or not value:
#             return StandardResponse.render(
#                 data=None, message="Paramètre ou valeur manquante", status_code=400
#             )
#         try:
#             queryset = self.get_queryset().filter(**{param: value})
#             return StandardResponse.render(
#                 data=self.get_serializer(queryset, many=True).data,
#                 message="Vérifications récupérées avec succès",
#                 status_code=200
#             )
#         except Exception as e:
#             return StandardResponse.render(
#                 data=None, message=f"Erreur : {str(e)}", status_code=500
#             )

#     @action(detail=True, methods=['post'])
#     def verifier(self, request, *args, **kwargs):
#         instance = self.get_object()
#         instance.utilisateur = request.user
#         instance.set_date_verification()
#         instance.save()
#         return StandardResponse.render(
#             data=None,
#             message="Vérification mise à jour avec succès",
#             status_code=200
#         )


# ─── HistoriqueInventaire ────────────────────────────────────
class HistoriqueInventaireViewSet(viewsets.ModelViewSet):
    queryset = HistoriqueInventaire.objects.all()
    serializer_class = HistoriqueInventaireSerializer
    permission_classes = [IsAuthenticated]


# ─── Inventaire ─────────────────────────────────────────────
class InventaireViewSet(viewsets.ModelViewSet):
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
        return Response(InventaireSerializer(queryset, many=True).data)

    @action(detail=False, methods=['post'])
    def lancer(self, request):
        description = request.data.get('description', 'Inventaire du mois')
        histo = Inventaire.lancer_inventaire(user=request.user, description=description)
        return Response(HistoriqueInventaireSerializer(histo).data, status=201)

    @action(detail=False, methods=['post'])
    def calculer_ecarts(self, request):
        histo_id = request.data.get('historique')
        for inv in Inventaire.objects.filter(historique=histo_id):
            inv.calculer_ecart()
        return Response({'message': 'Écarts calculés.'})

    @action(detail=False, methods=['post'])
    def redresser(self, request):
        histo_id = request.data.get('historique')
        new_histo = HistoriqueInventaire.objects.create(utilisateur=request.user)
        for inv in Inventaire.objects.filter(historique=histo_id):
            inv.redresser(new_histo)
        return Response({'message': 'Redressement effectué.'})


# ─── HistoriqueSeuilStock ────────────────────────────────────
class HistoriqueSeuilStockViewSet(viewsets.ModelViewSet):
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
class MouvementStockViewSet(viewsets.ModelViewSet):
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
        return Response({
            'total': total,
            'entrees': entrees,
            'sorties': sorties,
            'ajustements': ajustements,
            'autres': total - (entrees + sorties + ajustements),
        })