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
    is_critical = BooleanFilter(method='filter_critical')
    stock_below = NumberFilter(field_name='current_stock', lookup_expr='lte')
    stock_above = NumberFilter(field_name='current_stock', lookup_expr='gte')

    def filter_critical(self, queryset, name, value):
        if value:
            return queryset.filter(current_stock__lte=django_models.F('stock_threshold'))
        return queryset

    class Meta:
        model = Product
        exclude = ['product_img', 'created_at', 'updated_at']


class SupplierFilter(FilterSet):
    class Meta:
        model = Supplier
        fields = '__all__'