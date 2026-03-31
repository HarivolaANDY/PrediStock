from django_filters import FilterSet
from .models import Role


class RoleFilter(FilterSet):
    class Meta:
        model = Role
        fields = '__all__'