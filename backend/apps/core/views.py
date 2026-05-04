import io
import os
from datetime import date
from io import BytesIO

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.http import FileResponse
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import PDFHistorique
from .serializers import DynamicModelSerializer, PDFHistoriqueSerializer
from apps.core.utils import StandardResponse
from .utils import process_pdf_async
# from .tasks import process_pdf_async


TABLE_STYLES = [
    TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]),
    TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]),
]


class GenericCRUDViewSet(viewsets.ModelViewSet):
    """
    ViewSet de base — toutes les vues héritent de celui-ci.
    Injecte automatiquement notifications et activités sur create/update.
    """
    model = None
    serializer_class = None
    queryset = None
    fields = '__all__'
    filter_backends = [DjangoFilterBackend]
    filterset_class = None

    def get_queryset(self):
        if self.queryset is not None:
            return self.queryset
        if self.model is None:
            raise ValueError("'model' doit être défini dans la classe héritée.")
        return self.model.objects.all()

    def get_serializer_class(self):
        if self.serializer_class is not None:
            return self.serializer_class
        if self.model is None:
            raise ValueError("'model' doit être défini dans la classe héritée.")
        return DynamicModelSerializer.for_model(self.model, self.fields)

    def _get_model_name(self, instance=None):
        if self.model:
            return self.model.__name__
        if instance:
            return instance.__class__.__name__
        return "Objet"

    def _log(self, request, action_label, instance):
        """Enregistre une notification et une activité — seulement si authentifié."""
        if not request.user or not request.user.is_authenticated:
            return
        from apps.notifications.models import Notification
        model_name = self._get_model_name(instance)
        object_nom = getattr(instance, 'nom', None) or getattr(instance, 'name', str(instance))
        user = request.user

        Notification.creer(
            utilisateur=user,
            priorite=2,
            titre=f"{action_label} — {model_name}",
            data={
                "model_name": model_name,
                "objet_nom": object_nom,
                "notif": action_label,
            },
        )


    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return StandardResponse.render(
            data=response.data, 
            message="Liste des objets récupérée avec succès", 
            status_code=200
        )

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        return StandardResponse.render(
            data=response.data, message="Objet récupéré", status_code=200
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            obj = serializer.save()
            self._log(request, "Création", obj)
            return StandardResponse.render(
                data=serializer.data, message="Objet créé avec succès", status_code=201
            )
        return StandardResponse.render(
            data=serializer.errors,
            message="Données invalides",
            status_code=400
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            obj = serializer.save()
            self._log(request, "Modification", obj)
            return StandardResponse.render(
                data=serializer.data, message="Objet modifié avec succès", status_code=200
            )
        return StandardResponse.render(
            data=serializer.errors,
            message="Données invalides",
            status_code=400
        )

class PDFHistoriqueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PDFHistorique.objects.all()
    serializer_class = PDFHistoriqueSerializer
    permission_classes = [IsAuthenticated]


class PDFGeneratorViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _advanced_pdf(self, data, infos=None, style_index=0):
        if infos is None:
            infos = {}
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name='CustomCenter', parent=styles['Normal'],
            fontSize=13, alignment=TA_CENTER, textColor=colors.gray
        ))
        styles.add(ParagraphStyle(
            name='StyleTete', parent=styles['Normal'],
            fontSize=10, alignment=TA_LEFT, textColor=colors.black
        ))

        elements = [
            Paragraph("Rapports", styles['title']),
            Spacer(1, 0.2 * inch),
            Paragraph(infos.get('titre', 'Rapport'), styles['CustomCenter']),
            Spacer(1, 0.2 * inch),
        ]

        header_data = [
            [Paragraph("Predistock", styles['StyleTete'])],
            [Paragraph(date.today().strftime('%Y-%m-%d'), styles['StyleTete'])],
            [Paragraph(infos.get('sous_titre', ''), styles['StyleTete'])],
            [Paragraph(f"Auteur : {infos.get('auteur', 'Predistock')}", styles['StyleTete'])],
        ]
        header_table = Table(header_data, colWidths=[doc.width], hAlign='LEFT')
        header_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), infos.get('couleur', colors.lightblue)),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements += [header_table, Spacer(1, 0.3 * inch)]

        col_widths = infos.get('colWidths')
        table = Table(data, colWidths=col_widths) if col_widths else Table(data)
        table.setStyle(TABLE_STYLES[style_index])
        elements.append(table)

        def _footer(canvas_obj, doc_obj):
            canvas_obj.saveState()
            canvas_obj.setFont("Helvetica", 9)
            canvas_obj.setFillColor(colors.grey)
            canvas_obj.drawCentredString(
                doc.leftMargin + doc.width / 2, 0.5 * inch,
                f"--Page {doc_obj.page}--"
            )
            canvas_obj.restoreState()

        doc.build(elements, onFirstPage=_footer, onLaterPages=_footer)
        buffer.seek(0)
        return buffer

    @action(detail=False, methods=['post'])
    def mouvements_stock(self, request):
        from apps.stock.models import MouvementStock
        qs = MouvementStock.objects.select_related('produit', 'utilisateur').all()
        data = [["Produit", "Quantité", "Date", "Action", "Référence", "Utilisateur"]] + [
            [
                m.produit.name if m.produit else '',
                m.quantity,
                m.date.strftime("%Y-%m-%d") if m.date else '',
                "entrée" if m.movement_type == 'IN' else "sortie",
                m.referrence or '',
                str(m.utilisateur) if m.utilisateur else '',
            ]
            for m in qs
        ]
        infos = {
            "titre": "Mouvements de stock",
            "sous_titre": "Rapport des mouvements.",
            "auteur": request.user.username.upper(),
            "couleur": colors.lightgreen,
            "colWidths": [1.8*inch, 0.8*inch, 0.9*inch, 0.5*inch, 1.5*inch, inch],
        }
        buffer = self._advanced_pdf(data, infos, style_index=1)
        PDFHistorique.objects.create(
            utilisateur=request.user,
            titre=f"mouvements_{date.today()}.pdf"
        )
        return FileResponse(buffer, as_attachment=True,
                            filename=f"mouvements_{date.today()}.pdf")

    @action(detail=False, methods=['post'])
    def dynamic(self, request):
        from apps.stock.models import MouvementStock, Inventaire
        table_type = request.data.get('table')
        spec = request.data.get('specific')

        if table_type == "MouvementStock":
            qs = MouvementStock.objects.all()
            if spec in ("IN", "OUT"):
                qs = qs.filter(movement_type=spec)
            data = [["Produit", "Quantité", "Date", "Action", "Référence", "Utilisateur"]] + [
                [
                    m.produit_dv.designation if m.produit_dv else '',
                    m.quantity,
                    m.date.strftime("%Y-%m-%d") if m.date else '',
                    "entrée" if m.movement_type == 'IN' else "sortie",
                    m.referrence or '',
                    str(m.utilisateur) if m.utilisateur else '',
                ]
                for m in qs
            ]
            infos = {
                "titre": "Mouvements de stock",
                "sous_titre": "Rapport des mouvements.",
                "auteur": request.user.username.upper(),
                "couleur": colors.lightgreen,
                "colWidths": [1.8*inch, 0.8*inch, 0.9*inch, 0.5*inch, 1.5*inch, inch],
            }

        elif table_type == "Inventaire":
            qs = Inventaire.objects.filter(historique=spec).select_related('produit')
            data = [["Produit mère", "Désignation", "Qté théorique", "Qté physique"]] + [
                [
                    str(inv.produit.product) if inv.produit else '',
                    inv.produit.designation if inv.produit else '',
                    inv.quantite_theo, '',
                ]
                for inv in qs
            ]
            infos = {
                "titre": "Inventaire des produits",
                "sous_titre": "Rapport d'inventaire.",
                "auteur": request.user.username.upper(),
                "couleur": colors.grey,
                "colWidths": [2*inch, 2*inch, inch, inch],
            }

        else:
            User = get_user_model()
            data = [["Nom Prénoms", "Email", "Numéro", "Département", "ID"]] + [
                [
                    f"{u.first_name} {u.last_name}", u.email,
                    getattr(u, 'phone', ''),
                    getattr(u, 'department', 'Madagascar'),
                    u.id,
                ]
                for u in User.objects.all()
            ]
            infos = {
                "titre": "Liste des Utilisateurs",
                "sous_titre": "Rapport utilisateurs.",
                "auteur": request.user.username.upper(),
                "couleur": colors.orangered,
            }

        buffer = self._advanced_pdf(data, infos, style_index=1)
        return FileResponse(buffer, as_attachment=True, filename="rapport.pdf")

    @action(detail=False, methods=['post'], url_path='upload-pdf')
    def upload_pdf(self, request):
        file = request.FILES.get('pdf_file')
        historique_id = request.data.get('historique_id')
        if not file:
            return StandardResponse.render(message="Aucun fichier fourni.", status_code=400)
        if not file.name.lower().endswith('.pdf'):
            return StandardResponse.render(message="Le fichier doit être un PDF.", status_code=400)

        upload_dir = os.path.join(settings.MEDIA_ROOT, 'pdf_uploads')
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"inventaire_h{historique_id or 'unknown'}_{file.name}"
        path = default_storage.save(os.path.join('pdf_uploads', filename), file)
        file_url = request.build_absolute_uri(settings.MEDIA_URL + path)

        return StandardResponse.render(
            data={"filename": filename, "url": file_url},
            message="PDF uploadé avec succès.",
            status_code=200
        )

    @action(detail=False, methods=['post'], url_path='process-pdf')
    def process_pdf_view(self, request):
        file          = request.FILES.get('pdf_file')
        historique_id = request.data.get('historique_id')

        if not file or not historique_id:
            return StandardResponse.render(
                message="pdf_file et historique_id sont requis.",
                status_code=400
            )
        if not file.name.lower().endswith('.pdf'):
            return StandardResponse.render(
                message="Le fichier doit être un PDF.",
                status_code=400
            )

        temp_dir  = os.path.join(settings.MEDIA_ROOT, 'temp_pdf')
        os.makedirs(temp_dir, exist_ok=True)
        file_path = os.path.join(temp_dir, f"pdf_{historique_id}_{file.name}")

        with open(file_path, 'wb') as f:
            for chunk in file.chunks():
                f.write(chunk)

        result = process_pdf_async(
            file_path=file_path,
            historique_id=historique_id,
            user_id=request.user.id,
        )

        status_code = 200 if result.get('updated', 0) > 0 or result.get('detected', 0) == 0 else 206
        return StandardResponse.render(
            data=result,
            message=result.get('message', 'Traitement terminé.'),
            status_code=status_code
        )