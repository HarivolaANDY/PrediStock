from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DataImportViewSet, ExecutionPipelineViewSet,
    PredictionViewSet, RecommandationViewSet,
    ExecutePipelineView, RunPredictionView, RecommenderView,
    ModeleListView, ModelePerformanceView
)

router = DefaultRouter()
router.register(r'data-import',        DataImportViewSet,        basename='data-import')
router.register(r'execution-pipeline', ExecutionPipelineViewSet,  basename='execution-pipeline')
router.register(r'predictions',        PredictionViewSet,         basename='prediction')
router.register(r'recommandations',    RecommandationViewSet,     basename='recommandation')

urlpatterns = [
    path('execution-pipeline/run-etl/', ExecutePipelineView.as_view()),
    path('predict/',                    RunPredictionView.as_view()),
    path('chat/',                       RecommenderView.as_view()),
    path('modeles/',                    ModeleListView.as_view(),       name='modele-list'),      # ← nouveau
    path('modeles/performance/',        ModelePerformanceView.as_view(), name='modele-performance'), # ← nouveau
    path('', include(router.urls)),
]
