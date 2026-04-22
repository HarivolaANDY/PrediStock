import csv
import pandas as pd
from rest_framework import serializers
from .models import (
    Modele, DataImport, ExecutionPipeline,
    Prediction, RuptureStock, Recommandation,
)
from .schemas import PYDANTIC_MODELS

ALLOWED_EXTENSIONS = ['csv', 'json', 'xlsx', 'xls', 'parquet']


class ModeleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Modele
        fields = '__all__'


class DataImportSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataImport
        fields = [
            'id', 'name', 'file_uploaded', 'status', 'target_table',
            'file_type', 'file_size', 'update_table', 'uploaded_at'
        ]
        read_only_fields = ['id', 'file_type', 'file_size', 'uploaded_at']

    def validate_target_table(self, value):
        allowed = list(PYDANTIC_MODELS.keys())
        if value not in allowed:
            raise serializers.ValidationError(
                f"Table '{value}' non autorisée. Choisissez parmi : {allowed}"
            )
        return value

    def validate_file_uploaded(self, file):
        ext = file.name.split('.')[-1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                f"Extension '{ext}' non autorisée. Autorisées : {ALLOWED_EXTENSIONS}"
            )
        try:
            if ext == 'csv':
                data_str = file.read().decode("utf-8")
                dialect = csv.Sniffer().sniff(data_str[:1024])
                file.seek(0)
                df = pd.read_csv(file, sep=dialect.delimiter)
            elif ext in ['xlsx', 'xls']:
                df = pd.read_excel(file)
            elif ext == 'json':
                df = pd.read_json(file)
            elif ext == 'parquet':
                df = pd.read_parquet(file)

            target_table = self.initial_data.get('target_table')
            if not target_table:
                raise serializers.ValidationError("Veuillez spécifier la table cible.")
            PydanticModel = PYDANTIC_MODELS[target_table]
            if not df.empty:
                try:
                    PydanticModel(**df.iloc[0].to_dict())
                except Exception as e:
                    raise serializers.ValidationError(f"Erreur de validation : {str(e)}")
        except serializers.ValidationError:
            raise
        except Exception as e:
            raise serializers.ValidationError(f"Fichier invalide : {str(e)}")
        return file

    def create(self, validated_data):
        file = validated_data.get('file_uploaded')
        validated_data['file_type'] = file.name.split('.')[-1].lower()
        validated_data['file_size'] = file.size
        return super().create(validated_data)


class ExecutionPipelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExecutionPipeline
        fields = '__all__'


class PredictionSerializer(serializers.ModelSerializer):
    # Expose le nom du produit pour le frontend
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Prediction
        fields = '__all__'


class RuptureStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuptureStock
        fields = '__all__'


# ── Serializer imbriqué pour les détails produit ──────────────────────────────
class ProductDetailsSerializer(serializers.Serializer):
    name = serializers.CharField(source='product.name')
    current_stock = serializers.IntegerField(source='product.current_stock')

    def to_representation(self, instance):
        if instance.product:
            return {
                'name': instance.product.name,
                'current_stock': instance.product.current_stock,
            }
        return None


class RecommandationSerializer(serializers.ModelSerializer):
    # ← Champ calculé exposant name + current_stock du produit lié
    product_details = serializers.SerializerMethodField()

    class Meta:
        model = Recommandation
        fields = '__all__'

    def get_product_details(self, obj):
        if obj.product:
            return {
                'name': obj.product.name,
                'current_stock': obj.product.current_stock,
            }
        return None


class CreateRecommandationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recommandation
        exclude = ['donnee_appui', 'creer_le', 'est_applique', 'appliquee_le']