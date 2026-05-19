from django_filters.rest_framework import FilterSet
from django_filters import filters
from .models import BonCommande, ContenuDans, DonneeVente, ProduitDonneeVente, Remboursement, TransactionPaiement


class BCfilter(FilterSet):
    numero_commande = filters.CharFilter(lookup_expr='icontains')
    status = filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = BonCommande
        fields = '__all__'


class ContenuDansFilter(FilterSet):
    class Meta:
        model = ContenuDans
        fields = '__all__'


class DonneeVenteFilter(FilterSet):
    numero_vente = filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = DonneeVente
        fields = {
            'montant_total':     ['exact', 'gt', 'lt'],
            'date_vente':        ['exact', 'gt', 'lt', 'year', 'month'],
            'segment_clientele': ['exact', 'icontains'],
            'utilisateur':       ['exact'],
        }


class RemboursementFilter(FilterSet):
    class Meta:
        model = Remboursement
        fields = {
            'source_type': ['exact'],
            'numero_transaction': ['icontains'],
            'date_remboursement': ['gte', 'lte', 'exact'],
        }