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