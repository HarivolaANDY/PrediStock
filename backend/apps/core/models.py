from django.db import models
from django.conf import settings


class PDFHistorique(models.Model):
    titre = models.CharField(max_length=255)
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Historique PDF"
        verbose_name_plural = "Historiques PDF"

    def __str__(self):
        return self.titre

class GeneratedReport(models.Model):
    name = models.CharField(max_length=255)
    report_type = models.CharField(max_length=100)
    format = models.CharField(max_length=20)
    size = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, default='Terminé')
    file = models.FileField(upload_to='generated_reports/', null=True, blank=True)
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Rapport Généré"
        verbose_name_plural = "Rapports Générés"

    def __str__(self):
        return f"{self.name} ({self.format})"