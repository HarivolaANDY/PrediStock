from django.contrib import admin
from .models import PDFHistorique


@admin.register(PDFHistorique)
class PDFHistoriqueAdmin(admin.ModelAdmin):
    list_display = ['titre', 'utilisateur', 'created_at']
    ordering = ['-created_at']
    search_fields = ['titre']