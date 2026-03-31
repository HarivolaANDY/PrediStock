import django_filters
from .models import Modele, ExecutionPipeline, Prediction, Recommandation


class ModeleFilter(django_filters.FilterSet):
    nom_modele = django_filters.CharFilter(lookup_expr='icontains')
    mae_min = django_filters.NumberFilter(field_name='mae', lookup_expr='gte')
    mae_max = django_filters.NumberFilter(field_name='mae', lookup_expr='lte')
    rmse_min = django_filters.NumberFilter(field_name='rmse', lookup_expr='gte')
    rmse_max = django_filters.NumberFilter(field_name='rmse', lookup_expr='lte')
    mape_min = django_filters.NumberFilter(field_name='mape', lookup_expr='gte')
    mape_max = django_filters.NumberFilter(field_name='mape', lookup_expr='lte')
    date_apres = django_filters.DateTimeFilter(field_name='date_evaluation', lookup_expr='gte')
    date_avant = django_filters.DateTimeFilter(field_name='date_evaluation', lookup_expr='lte')

    class Meta:
        model = Modele
        fields = {'id_modele': ['exact'], 'periode_evaluation': ['exact', 'gte', 'lte']}


class ExecutionPipelineFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr='icontains')
    status = django_filters.CharFilter(lookup_expr='exact')
    commence_le = django_filters.DateTimeFilter()
    complete_le = django_filters.DateTimeFilter()

    class Meta:
        model = ExecutionPipeline
        fields = [
            'name', 'status', 'description',
            'enregistrement_traite', 'enregistrement_reussi', 'enregistrement_echoue',
            'commence_le', 'complete_le', 'created_at',
        ]


class PredictionFilter(django_filters.FilterSet):
    date_prediction_apres = django_filters.DateFilter(
        field_name='date_prediction', lookup_expr='gte'
    )
    date_prediction_avant = django_filters.DateFilter(
        field_name='date_prediction', lookup_expr='lte'
    )
    horizon_min = django_filters.NumberFilter(field_name='horizon', lookup_expr='gte')
    horizon_max = django_filters.NumberFilter(field_name='horizon', lookup_expr='lte')
    modele_utilise = django_filters.CharFilter(lookup_expr='exact')

    class Meta:
        model = Prediction
        fields = ['date_prediction', 'horizon', 'modele_utilise', 'creer_le', 'rupture']


class RecommandationFilter(django_filters.FilterSet):
    class Meta:
        model = Recommandation
        fields = {
            'type_recommandation': ['exact', 'icontains'],
            'quantite_suggeree':   ['exact', 'gt', 'lt'],
            'prix_estime':         ['exact', 'gt', 'lt'],
            'priority':            ['exact', 'icontains'],
            'est_applique':        ['exact'],
            'creer_le':            ['exact', 'gt', 'lt'],
            'appliquee_le':        ['exact', 'gt', 'lt'],
        }