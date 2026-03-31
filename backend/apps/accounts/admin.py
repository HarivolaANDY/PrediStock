from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Role


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active']
    list_filter = ['role', 'is_active', 'is_staff']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['username']
    fieldsets = UserAdmin.fieldsets + (
        ('Informations supplémentaires', {
            'fields': (
                'role', 'phone', 'department', 'location',
                'biography', 'avatar', 'status', 'temporaryPassword',
            )
        }),
    )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'prioritylevel', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']
    ordering = ['name']