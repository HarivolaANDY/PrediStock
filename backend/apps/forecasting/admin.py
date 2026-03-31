from django.contrib import admin
from .models import (
    Modele, DataImport, ExecutionPipeline,
    Prediction, RuptureStock, Recommandation,
)


@admin.register(Modele)
class ModeleAdmin(admin.ModelAdmin):
    list_display = ['nom_modele', 'score', 'mae', 'rmse', 'mape', 'date_evaluation']
    ordering = ['-date_evaluation']
    search_fields = ['nom_modele']


@admin.register(DataImport)
class DataImportAdmin(admin.ModelAdmin):
    list_display = ['name', 'target_table', 'status', 'file_type', 'file_size', 'uploaded_at']
    list_filter = ['status', 'target_table']
    search_fields = ['name']


@admin.register(ExecutionPipeline)
class ExecutionPipelineAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'enregistrement_traite',
                    'enregistrement_reussi', 'enregistrement_echoue', 'created_at']
    list_filter = ['status']
    ordering = ['-created_at']


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = ['product', 'date_prediction', 'stock_prevu',
                    'import_qty', 'export_qty', 'rupture', 'modele_utilise']
    list_filter = ['rupture', 'modele_utilise']
    search_fields = ['product__name']
    ordering = ['-date_prediction']


@admin.register(Recommandation)
class RecommandationAdmin(admin.ModelAdmin):
    list_display = ['product', 'date_prediction', 'type_recommandation',
                    'quantite_suggeree', 'priority', 'est_applique', 'creer_le']
    list_filter = ['priority', 'est_applique', 'type_recommandation']
    search_fields = ['product__name']
    ordering = ['-creer_le']

admin.site.register(RuptureStock)