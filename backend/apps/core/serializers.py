from rest_framework import serializers
from .models import PDFHistorique


class DynamicModelSerializer(serializers.ModelSerializer):
    """Sérialiseur générique — instancié dynamiquement par GenericCRUDViewSet."""

    class Meta:
        model = None
        fields = '__all__'

    @classmethod
    def for_model(cls, model, fields=None):
        meta = type('Meta', (), {
            'model': model,
            'fields': fields or '__all__'
        })
        return type(f'{model.__name__}Serializer', (cls,), {'Meta': meta})


class PDFHistoriqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = PDFHistorique
        fields = '__all__'