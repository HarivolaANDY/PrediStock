from decimal import Decimal, InvalidOperation

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Sum, Count
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.views import GenericCRUDViewSet
from apps.core.utils import StandardResponse
from .models import (
    BonCommande, ContenuDans, DonneeVente, ProduitDonneeVente, Remboursement, TransactionPaiement,
)
from .serializers import (
    BonCommandeSerializer, ContenuDansSerializer,
    DonneeVenteSerializer, ProduitDonneeVenteSerializer,
    RemboursementSerializer,
)
from .filters import BCfilter, ContenuDansFilter, DonneeVenteFilter, RemboursementFilter


def _refus_suppression(instance, nom):
    """
    Réponse 400 si `instance` (achat ou vente) a laissé des traces et ne peut donc pas être
    supprimée ; None sinon. Le message est lu par le frontend (champ « message »).
    """
    motif = instance.motif_non_supprimable()
    if motif is None:
        return None
    conseil = (
        f"{nom.capitalize()} est déjà annulée : elle reste conservée dans l'historique."
        if instance.status == 'Annulé'
        else "Annulez-la plutôt : l'annulation conserve l'historique et restitue le stock."
    )
    return StandardResponse.render(
        message=f"Suppression impossible : {motif}. {conseil}", status_code=400
    )


def _argent(valeur):
    """Montant lisible : « 5 000 Ar »."""
    return f"{Decimal(valeur):,.0f}".replace(",", " ") + " Ar"


def _enregistrer_paiement(instance, request, serializer_class, champ, nom):
    """
    POST .../payer/ {montant, mode_paiement?, notes?} : enregistre UN versement sur un achat ou une
    vente (paiement partiel possible). Crée la ligne de l'historique des paiements, met à jour
    `montant_paye`, le statut de paiement (Partiel / Payé) et le mode, puis renvoie le document.
    """
    if instance.status == 'Annulé':
        return StandardResponse.render(
            message=f"Impossible d'enregistrer un paiement : {nom} est annulée.", status_code=400)
    try:
        montant = Decimal(str(request.data.get('montant')))
        valide = montant.is_finite() and montant > 0
    except (InvalidOperation, TypeError, ValueError):
        valide = False
    if not valide:
        return StandardResponse.render(message="Le montant doit être un nombre supérieur à 0.", status_code=400)

    mode = request.data.get('mode_paiement') or instance.mode_paiement
    if mode not in instance.PaymentMethod.values:
        return StandardResponse.render(message=f"Mode de paiement inconnu : {mode}.", status_code=400)

    with transaction.atomic():
        # Verrou + relecture : deux versements simultanés ne peuvent pas dépasser le total
        instance = type(instance).objects.select_for_update().get(pk=instance.pk)
        reste = instance.montant_total - instance.montant_paye
        if montant > reste:
            return StandardResponse.render(
                message=f"Le montant ({_argent(montant)}) dépasse le reste à payer ({_argent(reste)}).",
                status_code=400)
        TransactionPaiement.objects.create(
            **{champ: instance}, montant=montant, mode_paiement=mode,
            notes=str(request.data.get('notes') or ''),
        )
        instance.montant_paye = instance.montant_paye + montant
        instance.mode_paiement = mode
        instance.statut_paiement = (
            instance.PaymentStatus.PAYE if instance.montant_paye >= instance.montant_total
            else instance.PaymentStatus.PARTIEL
        )
        instance.save()  # l'historique est déjà à jour : le signal ne crée pas de doublon
    return Response(serializer_class(instance).data)


class BCViewSet(viewsets.ModelViewSet):
    queryset = BonCommande.objects.all().prefetch_related('lignes__lot', 'paiements')
    serializer_class = BonCommandeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = BCfilter

    def destroy(self, request, *args, **kwargs):
        refus = _refus_suppression(self.get_object(), "la commande")
        if refus is not None:
            return refus
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def payer(self, request, pk=None):
        return _enregistrer_paiement(self.get_object(), request, BonCommandeSerializer, 'bon_commande', "la commande")


class ContenuDansViewSet(GenericCRUDViewSet):
    model = ContenuDans
    queryset = ContenuDans.objects.all()
    serializer_class = ContenuDansSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = ContenuDansFilter


class DonneeVenteViewSet(viewsets.ModelViewSet):
    queryset = DonneeVente.objects.all().order_by('-date_vente').prefetch_related('lignes', 'paiements')
    serializer_class = DonneeVenteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = DonneeVenteFilter

    def destroy(self, request, *args, **kwargs):
        refus = _refus_suppression(self.get_object(), "la vente")
        if refus is not None:
            return refus
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def payer(self, request, pk=None):
        return _enregistrer_paiement(self.get_object(), request, DonneeVenteSerializer, 'donnee_vente', "la vente")


class ProduitDonneeVenteViewSet(GenericCRUDViewSet):
    model = ProduitDonneeVente
    queryset = ProduitDonneeVente.objects.all()
    serializer_class = ProduitDonneeVenteSerializer


class RemboursementViewSet(viewsets.ModelViewSet):
    queryset = Remboursement.objects.all()
    serializer_class = RemboursementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = RemboursementFilter

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
                data=RemboursementSerializer(qs, many=True).data,
                message="Renvois récupérés.", status_code=200
            )
        except Exception as e:
            return StandardResponse.render(message=f"Erreur : {e}", status_code=500)


class PurchaseSalesAnalyticsView(APIView):
    """
    Synthèse financière globale : achats vs ventes, avec marge estimée.

    Mêmes règles que l'écran « Analyse » du frontend (sans les filtres de période/produit/flux) :
      • seuls les achats et ventes LIVRÉS sont comptés (ni « En attente », ni « Annulé ») ;
      • marge = ventes − achats − remboursements de ventes encore à verser (« Non réglé »).
        Les remboursements d'achats (à encaisser) n'entrent pas dans la marge.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        purchase_agg = BonCommande.objects.filter(
            status=BonCommande.Status.LIVRE
        ).aggregate(
            total=Sum('montant_total'),
            count=Count('id')
        )
        sales_agg = DonneeVente.objects.filter(
            status=DonneeVente.Status.VALIDE
        ).aggregate(
            total=Sum('montant_total'),
            count=Count('id')
        )
        refunds_to_pay = Remboursement.objects.filter(
            source_type=Remboursement.TypeSource.VENTE,
            statut_reglement=Remboursement.StatusReglement.NON_REGLE,
        ).aggregate(total=Sum('montant'))['total']

        total_purchases = float(purchase_agg['total'] or 0)
        total_sales = float(sales_agg['total'] or 0)
        refunds_to_pay = float(refunds_to_pay or 0)

        data = {
            'total_purchases': round(total_purchases, 2),
            'total_sales': round(total_sales, 2),
            'margin': round(total_sales - total_purchases - refunds_to_pay, 2),
            'purchase_count': purchase_agg['count'] or 0,
            'sale_count': sales_agg['count'] or 0,
        }
        return Response({'success': True, 'data': data})