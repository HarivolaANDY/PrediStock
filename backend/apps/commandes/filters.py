from django_filters.rest_framework import FilterSet
from django_filters import filters
from .models import BonCommande, ContenuDans, DonneeVente, ProduitRenvoie


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
    class Meta:
        model = DonneeVente
        fields = {
            'quantite_vendu':    ['exact', 'gt', 'lt'],
            'prix_unitaire':     ['exact', 'gt', 'lt'],
            'montant_total':     ['exact', 'gt', 'lt'],
            'date_vente':        ['exact', 'gt', 'lt'],
            'canal_vente':       ['exact', 'icontains'],
            'segment_clientele': ['exact', 'icontains'],
            'utilisateur':       ['exact'],
        }


class ProduitRenvoieFilter(FilterSet):
    class Meta:
        model = ProduitRenvoie
        fields = '__all__'