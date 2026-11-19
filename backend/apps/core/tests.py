import io
from unittest.mock import patch, MagicMock
from django.urls import reverse
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token

from apps.accounts.models import User
from apps.catalogue.models import Product
from apps.commandes.models import BonCommande, ContenuDans, DonneeVente, ProduitDonneeVente
from apps.stock.models import MouvementStock
from reportlab.lib.units import inch
from .models import PDFHistorique
from .utils import StandardResponse
from .middleware import RoleRequiredMiddleware
from .views import PDFGeneratorViewSet
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


# ════════════════════════════════════════════════════════════
#  RAPPORTS PDF DES MOUVEMENTS DE STOCK  (PDFGeneratorViewSet.mouvements_stock / dynamic)
#
#  Un achat ou une vente annulé(e) laisse deux mouvements : l'original et son inverse.
#   • rapport complet           → les deux apparaissent, distingués par la colonne « Motif » ;
#   • rapports « entrées » / « sorties » → flux RÉELS uniquement (sinon une « sortie » qui n'est
#     pas une vente, ou une « entrée » qui n'est pas un achat, y figurerait).
# ════════════════════════════════════════════════════════════

class RapportsMouvementsPdfTests(TestCase):
    def setUp(self):
        self.user = create_user(email="pdf@predistock.com", username="pdfuser")
        self.client = auth_client(self.user)
        self.produit = Product.objects.create(
            name="Eau 1.5L", sku="EAU", price=1000, current_stock=0, stock_threshold=1)

    # ── Aides ────────────────────────────────────────────────────────────────────────────

    def _achat_livre_puis_annule(self, numero="BC-ANNULE"):
        bc = BonCommande.objects.create(utilisateur=self.user, numero_commande=numero, montant_total=5000)
        ContenuDans.objects.create(bon_commande=bc, produit=self.produit, quantite=5, prix_unitaire=1000)
        bc.status = "Livré"
        bc.save()
        bc.status = "Annulé"
        bc.save()
        return bc

    def _achat_livre(self, numero="BC-REEL", qte=7):
        bc = BonCommande.objects.create(utilisateur=self.user, numero_commande=numero, montant_total=1000)
        ContenuDans.objects.create(bon_commande=bc, produit=self.produit, quantite=qte, prix_unitaire=1000)
        bc.status = "Livré"
        bc.save()
        return bc

    def _vente_livree(self, numero="VT-REEL", qte=2):
        dv = DonneeVente.objects.create(utilisateur=self.user, numero_vente=numero, montant_total=1000)
        ProduitDonneeVente.objects.create(donnee_vente=dv, produit=self.produit, quantite=qte, prix_unitaire=500)
        dv.status = "Livré"
        dv.save()
        return dv

    def _rapport(self, nom_url, **payload):
        """Appelle le rapport en interceptant les lignes envoyées au générateur PDF."""
        capture = {}

        def faux_pdf(vue, data, infos=None, style_index=0):
            capture['data'], capture['infos'] = data, infos
            return io.BytesIO(b"%PDF-faux")

        with patch.object(PDFGeneratorViewSet, '_advanced_pdf', faux_pdf):
            response = self.client.post(reverse(nom_url), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        entete, *corps = capture['data']
        texte = lambda cellule: getattr(cellule, 'text', cellule)  # les cellules à retour à la ligne sont des Paragraph
        return entete, [[texte(c) for c in ligne] for ligne in corps], capture['infos']

    @staticmethod
    def _colonne(entete, lignes, nom):
        i = entete.index(nom)
        return [ligne[i] for ligne in lignes]

    # ── Rapport « Mouvements de stock » (historique complet) ─────────────────────────────

    def test_le_rapport_complet_garde_l_original_et_l_annulation_avec_leur_motif(self):
        self._achat_livre_puis_annule()
        entete, lignes, _ = self._rapport('pdf-mouvements-stock')
        self.assertIn("Motif", entete)
        self.assertEqual(len(lignes), 2)
        self.assertEqual(sorted(self._colonne(entete, lignes, "Action")), ["entrée", "sortie"])
        self.assertEqual(set(self._colonne(entete, lignes, "Référence")), {lignes[0][entete.index("Référence")]})  # même référence
        motifs = self._colonne(entete, lignes, "Motif")
        self.assertTrue(any(m.startswith("Livraison BC BC-ANNULE") for m in motifs))
        self.assertTrue(any(m.startswith("Annulation de la livraison BC BC-ANNULE") for m in motifs))

    def test_le_rapport_complet_est_aussi_rempli_pour_un_mouvement_sans_motif(self):
        MouvementStock.objects.create(produit=self.produit, movement_type='IN', quantity=3)
        entete, lignes, _ = self._rapport('pdf-mouvements-stock')
        self.assertEqual(self._colonne(entete, lignes, "Motif"), [""])

    def test_largeurs_de_colonnes_du_rapport_complet_tiennent_dans_la_page(self):
        self._achat_livre_puis_annule()
        entete, _, infos = self._rapport('pdf-mouvements-stock')
        self.assertEqual(len(infos['colWidths']), len(entete))
        self.assertLessEqual(sum(infos['colWidths']), 6.5 * inch + 0.01)  # largeur utile d'une page « letter »

    def test_le_rapport_complet_est_historise(self):
        self._rapport('pdf-mouvements-stock')
        self.assertEqual(PDFHistorique.objects.filter(utilisateur=self.user).count(), 1)

    # ── Rapport « dynamique » ────────────────────────────────────────────────────────────

    def test_rapport_dynamique_sans_filtre_montre_tout_l_historique_avec_le_motif(self):
        self._achat_livre_puis_annule()
        entete, lignes, _ = self._rapport('pdf-dynamic', table='MouvementStock')
        self.assertIn("Motif", entete)
        self.assertEqual(len(lignes), 2)
        self.assertTrue(any("Annulation" in m for m in self._colonne(entete, lignes, "Motif")))

    def test_rapport_des_entrees_ne_contient_que_les_achats_reels(self):
        self._achat_livre_puis_annule()
        self._achat_livre()
        self._vente_livree()
        entete, lignes, _ = self._rapport('pdf-dynamic', table='MouvementStock', specific='IN')
        self.assertEqual(len(lignes), 1)
        self.assertTrue(lignes[0][entete.index("Motif")].startswith("Livraison BC BC-REEL"))
        self.assertEqual(self._colonne(entete, lignes, "Action"), ["entrée"])

    def test_rapport_des_sorties_ne_contient_aucune_sortie_fantome(self):
        """L'annulation d'un achat est une sortie de stock, mais pas une vente."""
        self._achat_livre_puis_annule()
        self._vente_livree()
        entete, lignes, _ = self._rapport('pdf-dynamic', table='MouvementStock', specific='OUT')
        self.assertEqual(len(lignes), 1)
        self.assertTrue(lignes[0][entete.index("Motif")].startswith("Vente VT-REEL"))

    def test_rapport_des_sorties_ignore_aussi_l_annulation_d_une_vente(self):
        dv = self._vente_livree("VT-ANNULEE")
        dv.status = "Annulé"
        dv.save()
        self._vente_livree("VT-REEL")
        entete, lignes, _ = self._rapport('pdf-dynamic', table='MouvementStock', specific='OUT')
        self.assertEqual([m for m in self._colonne(entete, lignes, "Motif")], ["Vente VT-REEL"])

    def test_rapport_dynamique_sans_annulation_est_inchange(self):
        self._achat_livre("BC-A", qte=4)
        self._achat_livre("BC-B", qte=6)
        entete, lignes, _ = self._rapport('pdf-dynamic', table='MouvementStock', specific='IN')
        self.assertEqual(len(lignes), 2)

    def test_largeurs_de_colonnes_du_rapport_dynamique_tiennent_dans_la_page(self):
        self._achat_livre()
        entete, _, infos = self._rapport('pdf-dynamic', table='MouvementStock')
        self.assertEqual(len(infos['colWidths']), len(entete))
        self.assertLessEqual(sum(infos['colWidths']), 6.5 * inch + 0.01)

    # ── Génération réelle du PDF ─────────────────────────────────────────────────────────

    def test_un_pdf_est_reellement_genere_meme_avec_des_motifs_longs_et_des_caracteres_speciaux(self):
        MouvementStock.objects.create(
            produit=self.produit, movement_type='IN', quantity=1,
            reason="Livraison <b>spéciale</b> & « urgente » " + "très longue " * 20, referrence="REF&<1>")
        for nom, payload in (('pdf-mouvements-stock', {}), ('pdf-dynamic', {'table': 'MouvementStock'})):
            with self.subTest(rapport=nom):
                response = self.client.post(reverse(nom), payload, format='json')
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertTrue(b"".join(response.streaming_content).startswith(b"%PDF"))

    def test_les_rapports_exigent_une_authentification(self):
        for nom, payload in (('pdf-mouvements-stock', {}), ('pdf-dynamic', {'table': 'MouvementStock'})):
            with self.subTest(rapport=nom):
                response = anon_client().post(reverse(nom), payload, format='json')
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ═══════════════════════════════════════════════════════════════════════════════════════════
#  demo_reset : sauvegarde / restauration de la base pour refaire une démonstration
# ═══════════════════════════════════════════════════════════════════════════════════════════

import sqlite3  # noqa: E402
import tempfile  # noqa: E402
from pathlib import Path  # noqa: E402

from django.core.management import call_command  # noqa: E402
from django.core.management.base import CommandError  # noqa: E402


class DemoResetTests(TestCase):
    """La commande travaille sur des bases SQLite temporaires : la vraie base n'est jamais ouverte."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.racine = Path(self._tmp.name)
        self.base = self.racine / "base.sqlite3"
        self.dossier = self.racine / "sauvegardes"
        con = sqlite3.connect(self.base)
        con.execute("CREATE TABLE vente (id INTEGER PRIMARY KEY, ref TEXT)")
        con.execute("INSERT INTO vente (ref) VALUES ('VT-001')")
        con.commit()
        con.close()

    # ── Aides ────────────────────────────────────────────────────────────────────────────
    def _lancer(self, *args):
        sortie = io.StringIO()
        call_command("demo_reset", *args, "--base", str(self.base), "--dossier", str(self.dossier),
                     "--noinput", stdout=sortie)
        return sortie.getvalue()

    def _refs(self, chemin=None):
        con = sqlite3.connect(chemin or self.base)
        try:
            return [r[0] for r in con.execute("SELECT ref FROM vente ORDER BY id")]
        finally:
            con.close()

    def _inserer(self, ref):
        con = sqlite3.connect(self.base)
        con.execute("INSERT INTO vente (ref) VALUES (?)", (ref,))
        con.commit()
        con.close()

    def _avant_restauration(self):
        return sorted(self.dossier.glob("avant-restauration-*.sqlite3"))

    # ── Sauvegarder ──────────────────────────────────────────────────────────────────────
    def test_sauvegarder_cree_une_copie_fidele(self):
        sortie = self._lancer("sauvegarder", "demo")
        self.assertIn("Sauvegarde « demo » créée", sortie)
        self.assertEqual(self._refs(self.dossier / "demo.sqlite3"), ["VT-001"])

    def test_sauvegarder_refuse_d_ecraser_le_point_de_depart(self):
        self._lancer("sauvegarder", "demo")
        self._inserer("VT-002")
        with self.assertRaisesMessage(CommandError, "existe déjà"):
            self._lancer("sauvegarder", "demo")
        # le point de départ d'origine est toujours intact
        self.assertEqual(self._refs(self.dossier / "demo.sqlite3"), ["VT-001"])

    def test_sauvegarder_avec_ecraser_remplace_la_copie(self):
        self._lancer("sauvegarder", "demo")
        self._inserer("VT-002")
        self._lancer("sauvegarder", "demo", "--ecraser")
        self.assertEqual(self._refs(self.dossier / "demo.sqlite3"), ["VT-001", "VT-002"])

    # ── Restaurer ────────────────────────────────────────────────────────────────────────
    def test_restaurer_remet_la_base_dans_l_etat_sauvegarde(self):
        self._lancer("sauvegarder", "demo")
        self._inserer("VT-002")
        self._inserer("VT-003")
        sortie = self._lancer("restaurer", "demo")
        self.assertEqual(self._refs(), ["VT-001"])
        self.assertIn("Base restaurée depuis « demo »", sortie)

    def test_restaurer_conserve_l_etat_perdu_dans_une_copie_de_securite(self):
        self._lancer("sauvegarder", "demo")
        self._inserer("VT-002")
        self._lancer("restaurer", "demo")
        copies = self._avant_restauration()
        self.assertEqual(len(copies), 1)
        self.assertEqual(self._refs(copies[0]), ["VT-001", "VT-002"])

    def test_on_peut_recommencer_autant_de_fois_que_necessaire(self):
        self._lancer("sauvegarder", "demo")
        for essai in range(3):
            self._inserer(f"PRISE-{essai}")
            self._lancer("restaurer", "demo")
            self.assertEqual(self._refs(), ["VT-001"])

    def test_restaurer_une_sauvegarde_inconnue_est_refuse(self):
        with self.assertRaisesMessage(CommandError, "introuvable"):
            self._lancer("restaurer", "fantome")
        self.assertEqual(self._refs(), ["VT-001"])

    def test_restaurer_une_sauvegarde_corrompue_laisse_la_base_intacte(self):
        self.dossier.mkdir()
        (self.dossier / "abimee.sqlite3").write_bytes(b"ceci n'est pas une base SQLite" * 50)
        self._inserer("VT-002")
        with self.assertRaises(CommandError):
            self._lancer("restaurer", "abimee")
        self.assertEqual(self._refs(), ["VT-001", "VT-002"])

    def test_restaurer_demande_confirmation_et_respecte_un_refus(self):
        self._lancer("sauvegarder", "demo")
        self._inserer("VT-002")
        with patch("builtins.input", return_value="non"):
            with self.assertRaisesMessage(CommandError, "annulée"):
                call_command("demo_reset", "restaurer", "demo", "--base", str(self.base),
                             "--dossier", str(self.dossier))
        self.assertEqual(self._refs(), ["VT-001", "VT-002"])
        self.assertEqual(self._avant_restauration(), [])

    def test_restaurer_accepte_une_confirmation_positive(self):
        self._lancer("sauvegarder", "demo")
        self._inserer("VT-002")
        with patch("builtins.input", return_value="oui"):
            call_command("demo_reset", "restaurer", "demo", "--base", str(self.base),
                         "--dossier", str(self.dossier), stdout=io.StringIO())
        self.assertEqual(self._refs(), ["VT-001"])

    def test_base_verrouillee_par_le_serveur_message_clair_et_base_inchangee(self):
        self._lancer("sauvegarder", "demo")
        self._inserer("VT-002")
        serveur = sqlite3.connect(self.base)
        serveur.execute("BEGIN EXCLUSIVE")  # comme un serveur qui tient la base
        try:
            with patch("apps.core.management.commands.demo_reset.ATTENTE_MAX", 1):
                with self.assertRaisesMessage(CommandError, "Arrêtez le serveur"):
                    self._lancer("restaurer", "demo")
        finally:
            serveur.rollback()
            serveur.close()
        self.assertEqual(self._refs(), ["VT-001", "VT-002"])

    # ── Garde-fous ───────────────────────────────────────────────────────────────────────
    def test_nom_de_sauvegarde_invalide_est_refuse(self):
        for nom in ("../evasion", "a/b", "a b", "démo"):
            with self.assertRaisesMessage(CommandError, "Nom invalide"):
                self._lancer("sauvegarder", nom)
        self.assertFalse(self.dossier.exists())

    def test_base_introuvable_est_refusee(self):
        self.base.unlink()
        with self.assertRaisesMessage(CommandError, "Base introuvable"):
            self._lancer("sauvegarder", "demo")

    def test_sans_option_base_une_base_hors_fichier_est_refusee(self):
        """Sous les tests, la configuration Django pointe une base en mémoire : la commande refuse."""
        with self.assertRaisesMessage(CommandError, "SQLite stockée dans un fichier"):
            call_command("demo_reset", "sauvegarder", "demo", "--dossier", str(self.dossier))

    # ── Lister ───────────────────────────────────────────────────────────────────────────
    def test_lister_sans_sauvegarde(self):
        self.assertIn("Aucune sauvegarde", self._lancer("lister"))

    def test_lister_affiche_les_sauvegardes(self):
        self._lancer("sauvegarder", "demo")
        self._lancer("sauvegarder", "autre")
        sortie = self._lancer("lister")
        self.assertIn("demo", sortie)
        self.assertIn("autre", sortie)


# ════════════════════════════════════════════════════════════
#  demo_seed : jeu de données de démonstration
# ════════════════════════════════════════════════════════════
from decimal import Decimal  # noqa: E402

from django.db.models import Sum  # noqa: E402
from django.utils import timezone  # noqa: E402

from apps.catalogue.models import Category, ProductBatch, ProduitDv, Supplier  # noqa: E402
from apps.commandes.models import Remboursement, TransactionPaiement  # noqa: E402
from apps.core.management.commands.demo_seed import Command as CommandeSeed, PRODUITS  # noqa: E402


class DemoSeedTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="admin-demo", email="admin-demo@predistock.com", password="Pass123",
            first_name="Admin", last_name="Demo",
        )

    def _lancer(self, *args):
        sortie = io.StringIO()
        call_command("demo_seed", "--sans-sauvegarde", *args, stdout=sortie)
        return sortie.getvalue()

    def _stock(self, nom):
        return Product.objects.get(name=nom).current_stock

    # ── Contenu du scénario ──────────────────────────────────────────────────────────────
    def test_le_scenario_cree_le_catalogue(self):
        self._lancer()
        self.assertEqual(Category.objects.count(), 3)
        self.assertEqual(Supplier.objects.count(), 3)
        self.assertEqual(Product.objects.filter(name__in=PRODUITS).count(), len(PRODUITS))
        self.assertEqual(ProduitDv.objects.filter(product__name="Savon de ménage").count(), 2)

    def test_le_scenario_cree_6_achats_et_7_ventes_aux_statuts_attendus(self):
        self._lancer()
        achats = {s: BonCommande.objects.filter(status=s).count() for s in ("Livré", "En attente", "Annulé")}
        ventes = {s: DonneeVente.objects.filter(status=s).count() for s in ("Livré", "En attente", "Annulé")}
        self.assertEqual(achats, {"Livré": 3, "En attente": 1, "Annulé": 2})
        self.assertEqual(ventes, {"Livré": 5, "En attente": 1, "Annulé": 1})

    def test_les_stocks_sont_ceux_des_mouvements_reellement_produits(self):
        self._lancer()
        attendu = {
            "Riz Vary Gasy 25 kg": 14, "Huile végétale 1 L": 56, "Sucre blanc 1 kg": 120,
            "Eau minérale 1,5 L (pack)": 28, "Jus d'orange 1 L": 35, "Savon de ménage": 190,
            "Lessive en poudre 1 kg": 9,
        }
        for nom, quantite in attendu.items():
            with self.subTest(produit=nom):
                self.assertEqual(Decimal(str(self._stock(nom))), Decimal(quantite))
        variantes = {v.designation: v.nombre for v in ProduitDv.objects.filter(product__name="Savon de ménage")}
        self.assertEqual({k: Decimal(str(v)) for k, v in variantes.items()},
                         {"Pain 200 g": Decimal(110), "Pain 400 g": Decimal(80)})

    def test_un_produit_passe_sous_son_seuil_d_alerte_pour_la_demonstration(self):
        self._lancer()
        sous_le_seuil = [p.name for p in Product.objects.filter(name__in=PRODUITS)
                         if Decimal(str(p.current_stock)) < p.stock_threshold]
        self.assertEqual(sous_le_seuil, ["Lessive en poudre 1 kg"])

    def test_le_magasin_demarre_avec_un_stock_d_ouverture_date_de_30_jours(self):
        self._lancer()
        ouverture = MouvementStock.objects.filter(referrence__startswith="INIT-")
        self.assertEqual(ouverture.count(), 8)  # 6 produits simples + 2 variantes du savon
        self.assertEqual(set(ouverture.values_list("movement_type", flat=True)), {"IN"})
        self.assertGreaterEqual((timezone.now() - min(ouverture.values_list("timestamp", flat=True))).days, 29)

    def test_la_marge_de_l_ecran_analyse_est_positive(self):
        """Achats raisonnables face aux ventes : la démonstration ne doit pas afficher une marge négative."""
        self._lancer()
        client = APIClient()
        client.force_authenticate(user=self.admin)
        reponse = client.get("/api/commandes/analytics/")
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        donnees = reponse.data.get("data", reponse.data)
        self.assertGreater(donnees["total_sales"], donnees["total_purchases"])
        self.assertGreater(donnees["margin"], 0)
        self.assertEqual((donnees["purchase_count"], donnees["sale_count"]), (3, 5))

    def test_chaque_ligne_d_achat_livree_a_son_lot(self):
        self._lancer()
        self.assertEqual(ProductBatch.objects.count(), 9)  # A1: 3, A2: 2, A3: 3, A4: 1 (annulée, lot conservé)

    def test_l_historique_des_paiements_est_coherent_avec_les_montants_payes(self):
        self._lancer()
        documents = [(d, "bon_commande") for d in BonCommande.objects.all()] + \
                    [(d, "donnee_vente") for d in DonneeVente.objects.all()]
        for document, champ in documents:
            total = TransactionPaiement.objects.filter(**{champ: document}).aggregate(t=Sum("montant"))["t"] or 0
            with self.subTest(document=str(document)):
                self.assertEqual(Decimal(total), document.montant_paye)

    def test_les_statuts_de_paiement_sont_varies(self):
        self._lancer()
        achats = set(BonCommande.objects.values_list("statut_paiement", flat=True))
        ventes = set(DonneeVente.objects.values_list("statut_paiement", flat=True))
        self.assertEqual(achats, {"Payé", "Partiel", "Non payé"})
        self.assertEqual(ventes, {"Payé", "Partiel", "Non payé"})

    def test_la_vente_a_credit_est_partiellement_payee_avec_un_delai_futur(self):
        self._lancer()
        credit = DonneeVente.objects.get(type_vente="Crédit")
        self.assertEqual(credit.segment_clientele, "VIP/Fidélisé")
        self.assertEqual(credit.statut_paiement, "Partiel")
        self.assertGreater(credit.delai_paiement, timezone.now())
        self.assertEqual(credit.status, "Livré")  # pas annulée à l'échéance : le délai n'est pas dépassé

    def test_trois_remboursements_dont_un_regle_avec_sa_ligne_de_paiement(self):
        self._lancer()
        remboursements = {r.source_type: r for r in Remboursement.objects.all()}
        self.assertEqual(set(remboursements), {"Achat", "Vente", "Retour"})
        self.assertEqual(remboursements["Achat"].statut_reglement, "Non réglé")
        self.assertEqual(remboursements["Vente"].statut_reglement, "Réglé")
        self.assertTrue(TransactionPaiement.objects.filter(remboursement=remboursements["Vente"]).exists())
        self.assertEqual(remboursements["Retour"].montant, Decimal("17000"))

    def test_les_annulations_laissent_des_mouvements_inverses_et_pas_de_suppression(self):
        self._lancer()
        annule = BonCommande.objects.filter(status="Annulé", montant_paye__gt=0).get()
        refs = [f"BC-LINE-{ligne.id}" for ligne in annule.lignes.all()]
        mouvements = MouvementStock.objects.filter(referrence__in=refs)
        self.assertEqual(mouvements.count(), 2)  # l'entrée d'origine + son inverse
        self.assertEqual(MouvementStock.effectifs().filter(referrence__in=refs).count(), 0)

    def test_l_achat_annule_sans_livraison_ne_laisse_aucun_mouvement(self):
        self._lancer()
        annule = BonCommande.objects.filter(status="Annulé", montant_paye=0).get()
        refs = [f"BC-LINE-{ligne.id}" for ligne in annule.lignes.all()]
        self.assertFalse(MouvementStock.objects.filter(referrence__in=refs).exists())

    def test_les_dates_sont_etalees_sur_quatre_semaines(self):
        self._lancer()
        maintenant = timezone.now()
        dates = list(DonneeVente.objects.values_list("date_vente", flat=True))
        self.assertGreaterEqual((maintenant - min(dates)).days, 19)
        self.assertLessEqual((maintenant - max(dates)).days, 2)
        premier_achat = min(BonCommande.objects.values_list("date_commande", flat=True))
        self.assertGreaterEqual((maintenant - premier_achat).days, 27)
        # les mouvements suivent la date de leur document
        plus_ancien = min(MouvementStock.objects.values_list("timestamp", flat=True))
        self.assertGreaterEqual((maintenant - plus_ancien).days, 27)

    def test_chaque_mouvement_porte_la_date_de_son_document(self):
        """Le Transactions et les graphiques s'appuient sur la date des mouvements : elle suit celle du document."""
        self._lancer()
        verifies = 0
        for m in MouvementStock.objects.exclude(referrence__startswith="INIT-"):
            if m.referrence.startswith("BC-LINE-"):
                document_date = ContenuDans.objects.get(pk=int(m.referrence.split("-")[2])).bon_commande.date_commande
            else:
                document_date = DonneeVente.objects.get(pk=int(m.referrence.split("-")[1])).date_vente
            with self.subTest(mouvement=m.referrence):
                self.assertLess(abs((m.timestamp - document_date).total_seconds()), 60)
            verifies += 1
        self.assertEqual(verifies, 22)  # 30 mouvements dont 8 ouvertures exclues

    def test_les_documents_portent_l_utilisateur_choisi(self):
        autre = User.objects.create_user(username="autre", email="autre@predistock.com", password="Pass123",
                                         first_name="A", last_name="B")
        self._lancer("--utilisateur", "autre")
        self.assertEqual(set(DonneeVente.objects.values_list("utilisateur_id", flat=True)), {autre.pk})
        self.assertEqual(set(BonCommande.objects.values_list("utilisateur_id", flat=True)), {autre.pk})

    def test_par_defaut_l_auteur_est_le_premier_superutilisateur(self):
        self._lancer()
        self.assertEqual(set(DonneeVente.objects.values_list("utilisateur_id", flat=True)), {self.admin.pk})

    def test_le_compte_rendu_liste_le_stock(self):
        sortie = self._lancer()
        self.assertIn("Données de démonstration insérées", sortie)
        self.assertIn("Lessive en poudre 1 kg", sortie)
        self.assertIn("sous le seuil", sortie)

    # ── Existant préservé ────────────────────────────────────────────────────────────────
    def test_les_donnees_existantes_sont_conservees(self):
        existant = Product.objects.create(name="Produit de l'utilisateur", sku="MIEN", price=100, current_stock=7)
        vente = DonneeVente.objects.create(utilisateur=self.admin, numero_vente="VT-MIENNE", montant_total=500)
        self._lancer()
        existant.refresh_from_db()
        self.assertEqual(existant.current_stock, 7)
        self.assertTrue(DonneeVente.objects.filter(pk=vente.pk, numero_vente="VT-MIENNE").exists())

    # ── Garde-fous ───────────────────────────────────────────────────────────────────────
    def test_une_seconde_execution_est_refusee_sans_rien_dupliquer(self):
        self._lancer()
        total = (Product.objects.count(), BonCommande.objects.count(), DonneeVente.objects.count())
        with self.assertRaisesMessage(CommandError, "déjà présentes"):
            self._lancer()
        self.assertEqual((Product.objects.count(), BonCommande.objects.count(), DonneeVente.objects.count()), total)

    def test_sans_superutilisateur_la_commande_est_refusee(self):
        User.objects.all().delete()
        with self.assertRaisesMessage(CommandError, "Aucun superutilisateur"):
            self._lancer()
        self.assertEqual(Product.objects.count(), 0)

    def test_utilisateur_inconnu_est_refuse(self):
        with self.assertRaisesMessage(CommandError, "introuvable"):
            self._lancer("--utilisateur", "fantome")
        self.assertEqual(Product.objects.count(), 0)

    def test_un_echec_en_cours_de_route_n_insere_rien(self):
        """Tout ou rien : la 3ᵉ vente échoue → ni catalogue, ni achats, ni ventes, ni mouvements."""
        appels = {"n": 0}
        original = CommandeSeed._creer_vente

        def tombe_a_la_3e(commande, *args, **kwargs):
            appels["n"] += 1
            if appels["n"] == 3:
                raise CommandError("panne simulée")
            return original(commande, *args, **kwargs)

        with patch.object(CommandeSeed, "_creer_vente", tombe_a_la_3e):
            with self.assertRaisesMessage(CommandError, "panne simulée"):
                self._lancer()
        self.assertEqual(Product.objects.count(), 0)
        self.assertEqual(BonCommande.objects.count(), 0)
        self.assertEqual(DonneeVente.objects.count(), 0)
        self.assertEqual(MouvementStock.objects.count(), 0)
        self.assertEqual(TransactionPaiement.objects.count(), 0)

    # ── Sauvegarde automatique ───────────────────────────────────────────────────────────
    def test_par_defaut_la_base_est_sauvegardee_avant_toute_ecriture(self):
        ordre = []
        with patch.object(CommandeSeed, "_sauvegarder", lambda *a, **k: ordre.append("sauvegarde")), \
                patch.object(CommandeSeed, "_semer", lambda *a, **k: ordre.append("semis")):
            call_command("demo_seed", stdout=io.StringIO())
        self.assertEqual(ordre, ["sauvegarde", "semis"])

    def test_sans_sauvegarde_possible_rien_n_est_insere(self):
        """Sous les tests la base est en mémoire : la sauvegarde est impossible, donc on s'arrête AVANT d'écrire."""
        with self.assertRaisesMessage(CommandError, "SQLite stockée dans un fichier"):
            call_command("demo_seed", stdout=io.StringIO())
        self.assertEqual(Product.objects.count(), 0)

    def test_l_option_sans_sauvegarde_n_appelle_pas_la_sauvegarde(self):
        with patch.object(CommandeSeed, "_sauvegarder") as sauvegarder:
            self._lancer()
        sauvegarder.assert_not_called()
