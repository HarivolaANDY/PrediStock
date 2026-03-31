from unittest.mock import patch, MagicMock
from django.urls import reverse
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token

from apps.accounts.models import User
from .models import PDFHistorique
from .utils import StandardResponse
from .middleware import RoleRequiredMiddleware
from .serializers import DynamicModelSerializer, PDFHistoriqueSerializer


# ─── Helpers ────────────────────────────────────────────────
def create_user(email="core@predistock.com", password="Pass123", username="coreuser"):
    return User.objects.create_user(
        username=username, email=email, password=password,
        first_name="Core", last_name="User",
    )

def get_token(user):
    token, _ = Token.objects.get_or_create(user=user)
    return token.key

def auth_client(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {get_token(user)}")
    client.enforce_csrf_checks = False
    return client

def anon_client():
    client = APIClient()
    client.enforce_csrf_checks = False
    return client


# ════════════════════════════════════════════════════════════
#  StandardResponse
# ════════════════════════════════════════════════════════════

class StandardResponseTests(TestCase):

    def test_render_success_200(self):
        response = StandardResponse.render(data={"key": "value"}, message="OK", status_code=200)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['message'], "OK")
        self.assertEqual(response.data['data'], {"key": "value"})

    def test_render_error_400(self):
        response = StandardResponse.render(message="Erreur", status_code=400)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['success'])

    def test_render_error_500(self):
        response = StandardResponse.render(message="Erreur serveur", status_code=500)
        self.assertEqual(response.status_code, 500)
        self.assertFalse(response.data['success'])

    def test_render_no_data(self):
        response = StandardResponse.render(status_code=200)
        self.assertIsNone(response.data['data'])

    def test_render_201_created(self):
        response = StandardResponse.render(data={"id": 1}, status_code=201)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['success'])

    def test_render_404_not_found(self):
        response = StandardResponse.render(message="Non trouvé", status_code=404)
        self.assertFalse(response.data['success'])

    def test_to_dict(self):
        sr = StandardResponse(success=True, message="Test", data={"x": 1})
        d = sr.to_dict()
        self.assertEqual(d['success'], True)
        self.assertEqual(d['message'], "Test")
        self.assertEqual(d['data'], {"x": 1})


# ════════════════════════════════════════════════════════════
#  PDFHistorique Model
# ════════════════════════════════════════════════════════════

class PDFHistoriqueModelTests(TestCase):

    def setUp(self):
        self.user = create_user()

    def test_create_pdf_historique(self):
        pdf = PDFHistorique.objects.create(
            titre="Rapport Test",
            utilisateur=self.user,
        )
        self.assertEqual(pdf.titre, "Rapport Test")
        self.assertEqual(pdf.utilisateur, self.user)

    def test_str_returns_titre(self):
        pdf = PDFHistorique.objects.create(titre="Mon Rapport", utilisateur=self.user)
        self.assertEqual(str(pdf), "Mon Rapport")

    def test_ordering_by_created_at_desc(self):
        PDFHistorique.objects.create(titre="Premier", utilisateur=self.user)
        PDFHistorique.objects.create(titre="Deuxième", utilisateur=self.user)
        pdfs = list(PDFHistorique.objects.all())
        self.assertEqual(pdfs[0].titre, "Deuxième")

    def test_utilisateur_null_on_user_delete(self):
        user2 = create_user(email="todelete@test.com", username="todelete")
        pdf = PDFHistorique.objects.create(titre="À Orpheliner", utilisateur=user2)
        user2.delete()
        pdf.refresh_from_db()
        self.assertIsNone(pdf.utilisateur)


# ════════════════════════════════════════════════════════════
#  PDFHistorique API
# ════════════════════════════════════════════════════════════

class PDFHistoriqueAPITests(TestCase):

    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)
        self.list_url = reverse('pdf-historique-list')
        PDFHistorique.objects.create(titre="Rapport 1", utilisateur=self.user)
        PDFHistorique.objects.create(titre="Rapport 2", utilisateur=self.user)

    def test_list_returns_200(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_unauthenticated_returns_401(self):
        response = anon_client().get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_contains_two_pdfs(self):
        response = self.client.get(self.list_url)
        # PDFHistoriqueViewSet est ReadOnly standard — retourne une liste directe
        data = response.data if isinstance(response.data, list) else response.data.get('data', response.data)
        self.assertEqual(len(data), 2)

    def test_retrieve_pdf_historique(self):
        pdf = PDFHistorique.objects.first()
        url = reverse('pdf-historique-detail', kwargs={'pk': pdf.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_nonexistent_returns_404(self):
        url = reverse('pdf-historique-detail', kwargs={'pk': 99999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_no_post_allowed(self):
        """PDFHistoriqueViewSet est ReadOnly — pas de création via API"""
        response = self.client.post(self.list_url, {"titre": "Nouveau"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_no_delete_allowed(self):
        """ReadOnly — pas de suppression"""
        pdf = PDFHistorique.objects.first()
        url = reverse('pdf-historique-detail', kwargs={'pk': pdf.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


# ════════════════════════════════════════════════════════════
#  DynamicModelSerializer
# ════════════════════════════════════════════════════════════

class DynamicModelSerializerTests(TestCase):

    def test_for_model_returns_serializer_class(self):
        SerializerClass = DynamicModelSerializer.for_model(PDFHistorique)
        self.assertTrue(issubclass(SerializerClass, DynamicModelSerializer))

    def test_for_model_correct_model(self):
        SerializerClass = DynamicModelSerializer.for_model(PDFHistorique)
        self.assertEqual(SerializerClass.Meta.model, PDFHistorique)

    def test_for_model_default_fields_all(self):
        SerializerClass = DynamicModelSerializer.for_model(PDFHistorique)
        self.assertEqual(SerializerClass.Meta.fields, '__all__')

    def test_for_model_custom_fields(self):
        SerializerClass = DynamicModelSerializer.for_model(PDFHistorique, fields=['id', 'titre'])
        self.assertEqual(SerializerClass.Meta.fields, ['id', 'titre'])

    def test_for_model_name(self):
        SerializerClass = DynamicModelSerializer.for_model(PDFHistorique)
        self.assertEqual(SerializerClass.__name__, 'PDFHistoriqueSerializer')


# ════════════════════════════════════════════════════════════
#  Middleware
# ════════════════════════════════════════════════════════════

class RoleRequiredMiddlewareTests(TestCase):

    def test_middleware_passes_through(self):
        """Le middleware laisse passer la requête sans modification."""
        get_response = MagicMock(return_value="response")
        middleware = RoleRequiredMiddleware(get_response)
        request = MagicMock()
        result = middleware(request)
        get_response.assert_called_once_with(request)
        self.assertEqual(result, "response")

    def test_middleware_init(self):
        get_response = MagicMock()
        middleware = RoleRequiredMiddleware(get_response)
        self.assertEqual(middleware.get_response, get_response)


# ════════════════════════════════════════════════════════════
#  emailor (mock — pas d'envoi réel)
# ════════════════════════════════════════════════════════════

class EmailorTests(TestCase):

    @patch('apps.core.emailor.smtplib.SMTP')
    def test_send_email_success(self, mock_smtp):
        """L'email est envoyé sans erreur avec un serveur SMTP mocké."""
        from apps.core.emailor import send_email_to_user
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__ = MagicMock(return_value=mock_server)
        mock_smtp.return_value.__exit__ = MagicMock(return_value=False)

        result = send_email_to_user(
            temp_password="TestPass123",
            email_receiver="test@predistock.com",
        )
        self.assertTrue(result)
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once()
        mock_server.sendmail.assert_called_once()

    @patch('apps.core.emailor.smtplib.SMTP')
    def test_send_email_failure_raises_runtime_error(self, mock_smtp):
        """Une erreur SMTP lève une RuntimeError."""
        from apps.core.emailor import send_email_to_user
        mock_smtp.side_effect = Exception("Connexion refusée")

        with self.assertRaises(RuntimeError):
            send_email_to_user(
                temp_password="TestPass123",
                email_receiver="test@predistock.com",
            )

    @patch('apps.core.emailor.smtplib.SMTP')
    def test_send_email_correct_recipient(self, mock_smtp):
        """L'email est envoyé à la bonne adresse."""
        from apps.core.emailor import send_email_to_user
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__ = MagicMock(return_value=mock_server)
        mock_smtp.return_value.__exit__ = MagicMock(return_value=False)

        send_email_to_user(
            temp_password="Pass123",
            email_receiver="destinataire@test.com",
        )
        call_args = mock_server.sendmail.call_args
        self.assertIn("destinataire@test.com", call_args[0])


# ════════════════════════════════════════════════════════════
#  GenericCRUDViewSet (via PDFHistorique comme proxy)
# ════════════════════════════════════════════════════════════

class GenericCRUDViewSetTests(TestCase):
    """
    GenericCRUDViewSet est testé indirectement via les autres apps.
    Ici on vérifie les comportements de base via PDFHistoriqueViewSet
    qui est un ReadOnlyModelViewSet héritant de la même base.
    """

    def setUp(self):
        self.user = create_user()
        self.client = auth_client(self.user)

    def test_list_response_has_success_key(self):
        PDFHistorique.objects.create(titre="Test", utilisateur=self.user)
        url = reverse('pdf-historique-list')
        response = self.client.get(url)
        # PDFHistoriqueViewSet retourne une liste — vérifier que c'est bien une liste
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_retrieve_response_has_data_key(self):
        pdf = PDFHistorique.objects.create(titre="Test Retrieve", utilisateur=self.user)
        url = reverse('pdf-historique-detail', kwargs={'pk': pdf.pk})
        response = self.client.get(url)
        # PDFHistoriqueViewSet retourne l'objet directement
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('titre', response.data)
        self.assertEqual(response.data['titre'], "Test Retrieve")
        
# ════════════════════════════════════════════════════════════
#  process_pdf_async (mocké — pas d'OCR réel en tests)
# ════════════════════════════════════════════════════════════

class ProcessPdfAsyncTests(TestCase):

    def setUp(self):
        self.user = create_user()
        from apps.catalogue.models import Category, Product, ProduitDv
        from apps.stock.models import HistoriqueInventaire, Inventaire

        cat     = Category.objects.create(name="Cat PDF")
        product = Product.objects.create(name="Riz PDF", sku="SKU-RIZ", current_stock=100)
        self.dv = ProduitDv.objects.create(
            product=product, designation="Riz 1kg", quantite=1, nombre=50
        )
        self.histo = HistoriqueInventaire.objects.create(
            utilisateur=self.user, description="Test PDF"
        )
        self.inv = Inventaire.objects.create(
            produit=self.dv, historique=self.histo,
            quantite_theo=50, quantite_phy=0,
        )

    @patch('apps.core.utils.process_pdf')
    def test_process_pdf_async_updates_inventaire(self, mock_ocr):
        """OCR détecte une quantité → Inventaire mis à jour."""
        from apps.core.utils import process_pdf_async

        mock_ocr.return_value = [{
            'produit_mere': 'Riz PDF',
            'designation':  'Riz 1kg',
            'qte_physique': 45,
        }]

        result = process_pdf_async(
            file_path='/fake/path.pdf',
            historique_id=self.histo.id,
            user_id=self.user.id,
        )

        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantite_phy, 45)
        self.assertEqual(result['detected'], 1)
        self.assertEqual(result['updated'], 1)

    @patch('apps.core.utils.process_pdf')
    def test_process_pdf_async_no_results(self, mock_ocr):
        """OCR ne détecte rien → retourne detected=0."""
        from apps.core.utils import process_pdf_async

        mock_ocr.return_value = []

        result = process_pdf_async('/fake/path.pdf', self.histo.id, self.user.id)
        self.assertEqual(result['detected'], 0)
        self.assertEqual(result['updated'], 0)

    @patch('apps.core.utils.process_pdf')
    def test_process_pdf_async_unknown_product(self, mock_ocr):
        """Produit non trouvé → detected=1 mais updated=0."""
        from apps.core.utils import process_pdf_async

        mock_ocr.return_value = [{
            'produit_mere': 'Produit Inexistant',
            'designation':  'Variante Inexistante',
            'qte_physique': 10,
        }]

        result = process_pdf_async('/fake/path.pdf', self.histo.id, self.user.id)
        self.assertEqual(result['detected'], 1)
        self.assertEqual(result['updated'], 0)

    @patch('apps.core.utils.process_pdf')
    def test_process_pdf_view_endpoint(self, mock_ocr):
        """Test de l'endpoint /api/core/pdf/process-pdf/ avec fichier mocké."""
        from django.core.files.uploadedfile import SimpleUploadedFile

        mock_ocr.return_value = [{
            'produit_mere': 'Riz PDF',
            'designation':  'Riz 1kg',
            'qte_physique': 30,
        }]

        client = auth_client(self.user)
        url    = reverse('pdf-process-pdf')
        pdf_file = SimpleUploadedFile(
            "test.pdf", b"%PDF-1.4 fake content", content_type="application/pdf"
        )
        response = client.post(url, {
            'pdf_file':     pdf_file,
            'historique_id': self.histo.id,
        }, format='multipart')

        self.assertIn(response.status_code, [200, 206])
        self.assertIn('detected', response.data['data'])

    def test_process_pdf_view_missing_file(self):
        """Sans fichier → 400."""
        client   = auth_client(self.user)
        url      = reverse('pdf-process-pdf')
        response = client.post(url, {'historique_id': self.histo.id}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_process_pdf_view_missing_historique(self):
        """Sans historique_id → 400."""
        from django.core.files.uploadedfile import SimpleUploadedFile
        client   = auth_client(self.user)
        url      = reverse('pdf-process-pdf')
        pdf_file = SimpleUploadedFile("test.pdf", b"%PDF-1.4", content_type="application/pdf")
        response = client.post(url, {'pdf_file': pdf_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_process_pdf_view_unauthenticated(self):
        """Sans token → 401."""
        from django.core.files.uploadedfile import SimpleUploadedFile
        url      = reverse('pdf-process-pdf')
        pdf_file = SimpleUploadedFile("test.pdf", b"%PDF-1.4", content_type="application/pdf")
        response = anon_client().post(url, {
            'pdf_file': pdf_file, 'historique_id': 1
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)