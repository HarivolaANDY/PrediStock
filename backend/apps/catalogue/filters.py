from django_filters import FilterSet, CharFilter, NumberFilter, BooleanFilter
from django.db import models as django_models
from .models import Category, Product, Supplier


class CategoryFilter(FilterSet):
    class Meta:
        model = Category
        fields = ['name', 'description', 'is_active']


class ProductFilter(FilterSet):
    name = CharFilter(lookup_expr='icontains')
    sku = CharFilter(lookup_expr='iexact')
    unite_mesure = CharFilter(lookup_expr='icontains')
    stock_below = NumberFilter(field_name='current_stock', lookup_expr='lte')
    stock_above = NumberFilter(field_name='current_stock', lookup_expr='gte')
    is_critical = BooleanFilter(method='filter_critical')
    stock_status = CharFilter(method='filter_stock_status')

    def filter_critical(self, queryset, name, value):
        """Conservé pour compatibilité."""
        if value is True:
            return queryset.filter(current_stock__lte=django_models.F('stock_threshold'))
        if value is False:
            return queryset.filter(current_stock__gt=django_models.F('stock_threshold'))
        return queryset

    def filter_stock_status(self, queryset, name, value):
        """
        4 statuts exclusifs — aucun chevauchement :

        rupture     : stock = 0
        critique    : 0 < stock <= 25% du seuil
        stock_faible: 25% < stock <= 50% du seuil
        en_stock    : stock > 50% du seuil
        """
        seuil_25 = django_models.ExpressionWrapper(
            django_models.F('stock_threshold') * 0.25,
            output_field=django_models.FloatField()
        )
        seuil_50 = django_models.ExpressionWrapper(
            django_models.F('stock_threshold') * 0.50,
            output_field=django_models.FloatField()
        )

        if value == 'rupture':
            return queryset.filter(current_stock=0)

        if value == 'critique':
            return queryset.annotate(seuil_25=seuil_25).filter(
                current_stock__gt=0,
                current_stock__lte=django_models.F('seuil_25')
            )

        if value == 'stock_faible':
            return queryset.annotate(seuil_25=seuil_25, seuil_50=seuil_50).filter(
                current_stock__gt=django_models.F('seuil_25'),
                current_stock__lte=django_models.F('seuil_50')
            )

        if value == 'en_stock':
            return queryset.annotate(seuil_50=seuil_50).filter(
                current_stock__gt=django_models.F('seuil_50')
            )

        return queryset

    class Meta:
        model = Product
        exclude = ['product_img', 'created_at', 'updated_at']


class SupplierFilter(FilterSet):
    class Meta:
        model = Supplier
        fields = '__all__'