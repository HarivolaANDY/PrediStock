from django_filters import rest_framework as filters
from .models import MouvementStock, HistoriqueSeuilStock
# from .models import (Effectuer, VerificationStock,)


# class EffectuerFilter(filters.FilterSet):
#     class Meta:
#         model = Effectuer
#         fields = '__all__'


# class VerificationStockFilter(filters.FilterSet):
#     class Meta:
#         model = VerificationStock
#         fields = '__all__'


class MouvementStockFilter(filters.FilterSet):
    movement_type = filters.CharFilter(lookup_expr='exact')
    utilisateur_id = filters.NumberFilter(field_name='utilisateur__id')
    date_from = filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='date', lookup_expr='lte')

    class Meta:
        model = MouvementStock
        exclude = ['timestamp']


class HistoriqueSeuilStockFilter(filters.FilterSet):
    class Meta:
        model = HistoriqueSeuilStock
        fields = '__all__'