from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DataImportViewSet, ExecutionPipelineViewSet,
    PredictionViewSet, RecommandationViewSet,
    ExecutePipelineView, RunPredictionView, RecommenderView,
)

router = DefaultRouter()
router.register(r'data-import',        DataImportViewSet,        basename='data-import')
router.register(r'execution-pipeline', ExecutionPipelineViewSet,  basename='execution-pipeline')
router.register(r'predictions',        PredictionViewSet,         basename='prediction')
router.register(r'recommandations',    RecommandationViewSet,     basename='recommandation')

urlpatterns = [
    # Routes directes EN PREMIER
    path('execution-pipeline/run-etl/', ExecutePipelineView.as_view(), name='etl-run'),
    path('predict/',                    RunPredictionView.as_view(),    name='run-prediction'),
    path('chat/',                       RecommenderView.as_view(),      name='recommender'),
    
    # Router EN DERNIER — une seule fois
    path('', include(router.urls)),
]
