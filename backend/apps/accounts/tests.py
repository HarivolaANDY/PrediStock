from django.urls import reverse
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import User, Role


# ─── Helpers ────────────────────────────────────────────────
def create_user(
    email="test@predistock.com",
    password="TestPass123",
    username="testuser",
    role="Utilisateur"
):
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name="Test",
        last_name="User",
        role=role,
    )
    return user


def create_admin():
    return create_user(
        email="admin@predistock.com",
        password="AdminPass123",
        username="adminuser",
        role="Administrateur"
    )


def get_token(user):
    token, _ = Token.objects.get_or_create(user=user)
    return token.key


def auth_client(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {get_token(user)}")
    client.enforce_csrf_checks = False  # ← ajouter cette ligne
    return client


# ─── Register ───────────────────────────────────────────────
class RegisterTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = reverse('api_register')

    def test_register_success(self):
        """Création d'un utilisateur avec temporaryPassword=True"""
        response = self.client.post(self.url, {
            "email": "nouveau@predistock.com",
            "first_name": "Jean",
            "last_name": "Dupont",
            "role": "Utilisateur",
            "temporaryPassword": True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertIn('user', response.data)
        self.assertTrue(User.objects.filter(email="nouveau@predistock.com").exists())

    def test_register_duplicate_email(self):
        """Deux users avec le même email → 400"""
        create_user(email="existe@predistock.com")
        response = self.client.post(self.url, {
            "email": "existe@predistock.com",
            "first_name": "Jean",
            "last_name": "Dupont",
            "temporaryPassword": True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_phone(self):
        """Deux users avec le même phone → 400"""
        create_user(email="user1@predistock.com")
        User.objects.filter(email="user1@predistock.com").update(phone="0340000001")
        response = self.client.post(self.url, {
            "email": "user2@predistock.com",
            "phone": "0340000001",
            "temporaryPassword": True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_email(self):
        """Email manquant → 400"""
        response = self.client.post(self.url, {
            "first_name": "Jean",
            "temporaryPassword": True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_invalid_role(self):
        """Rôle invalide → 400"""
        response = self.client.post(self.url, {
            "email": "role@predistock.com",
            "role": "RoleInexistant",
            "temporaryPassword": True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_without_phone_twice(self):
        """Deux users sans phone ne doivent pas créer de conflit UNIQUE"""
        self.client.post(self.url, {
            "email": "user1@predistock.com",
            "temporaryPassword": True,
        }, format='json')
        response = self.client.post(self.url, {
            "email": "user2@predistock.com",
            "temporaryPassword": True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


# ─── Login ──────────────────────────────────────────────────
class LoginTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = reverse('login')
        self.user = create_user(email="login@predistock.com", password="LoginPass123")

    def test_login_success(self):
        """Login avec email + password corrects → token"""
        response = self.client.post(self.url, {
            "email": "login@predistock.com",
            "password": "LoginPass123",
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertIn('user', response.data)

    def test_login_wrong_password(self):
        """Mauvais mot de passe → 401"""
        response = self.client.post(self.url, {
            "email": "login@predistock.com",
            "password": "MauvaisPass",
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_wrong_email(self):
        """Email inconnu → 401"""
        response = self.client.post(self.url, {
            "email": "inconnu@predistock.com",
            "password": "LoginPass123",
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_fields(self):
        """Champs manquants → 400 ou 401"""
        response = self.client.post(self.url, {}, format='json')
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED
        ])


# ─── Logout ─────────────────────────────────────────────────
class LogoutTests(TestCase):

    def setUp(self):
        self.url = reverse('api_logout')
        self.user = create_user()
        self.client = auth_client(self.user)

    def test_logout_success(self):
        """Logout avec token valide → 200 et token supprimé"""
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_logout_without_token(self):
        client = APIClient()
        client.enforce_csrf_checks = False
        response = client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ─── Profile ────────────────────────────────────────────────
class ProfileTests(TestCase):

    def setUp(self):
        self.url = reverse('api_profile')
        self.user = create_user()
        self.client = auth_client(self.user)

    def test_get_profile_authenticated(self):
        """Récupérer son profil → 200"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user.email)

    def test_get_profile_unauthenticated(self):
        client = APIClient()
        client.enforce_csrf_checks = False
        response = client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ─── Update User ────────────────────────────────────────────
class UpdateUserTests(TestCase):

    def setUp(self):
        self.url = reverse('api_update_user')
        self.user = create_user()
        self.client = auth_client(self.user)

    def test_update_user_success(self):
        """Modifier le département → 200"""
        response = self.client.put(self.url, {
            "id": self.user.id,
            "email": self.user.email,
            "first_name": "Modifié",
            "last_name": self.user.last_name,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_user_not_found(self):
        """ID inexistant → 404"""
        response = self.client.put(self.url, {
            "id": 99999,
            "email": "inexistant@test.com",
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ─── Check Availability ─────────────────────────────────────
class CheckAvailabilityTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = reverse('api_check_availability')
        self.user = create_user(email="pris@predistock.com")
        User.objects.filter(pk=self.user.pk).update(phone="0340000099")

    def test_email_already_taken(self):
        """Email déjà pris → 400"""
        response = self.client.post(self.url, {
            "email": "pris@predistock.com"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data.get('email_available', True))

    def test_phone_already_taken(self):
        """Phone déjà pris → 400"""
        response = self.client.post(self.url, {
            "phone": "0340000099"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_available_email(self):
        """Email libre → 200"""
        response = self.client.post(self.url, {
            "email": "libre@predistock.com"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_users(self):
        """GET retourne la liste des users"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)


# ─── Roles ──────────────────────────────────────────────────
class RoleTests(TestCase):

    def setUp(self):
        self.user = create_admin()
        self.client = auth_client(self.user)
        self.list_url = reverse('role-list')
        self.role = Role.objects.create(
            name="Testeur",
            description="Rôle de test",
            prioritylevel=1,
        )

    def test_list_roles(self):
        """Lister les rôles → 200"""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_role(self):
        """Créer un rôle → 201"""
        response = self.client.post(self.list_url, {
            "name": "Nouveau Rôle",
            "description": "Description",
            "prioritylevel": 2,
            "is_active": True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Role.objects.filter(name="Nouveau Rôle").exists())

    def test_retrieve_role(self):
        """Récupérer un rôle par ID → 200"""
        url = reverse('role-detail', kwargs={'pk': self.role.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['name'], "Testeur")

    def test_update_role(self):
        """Modifier un rôle → 200"""
        url = reverse('role-detail', kwargs={'pk': self.role.pk})
        response = self.client.put(url, {
            "name": "Testeur Modifié",
            "prioritylevel": 3,
            "is_active": True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_role(self):
        """Supprimer un rôle → 204"""
        url = reverse('role-detail', kwargs={'pk': self.role.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Role.objects.filter(pk=self.role.pk).exists())

    def test_list_roles_unauthenticated(self):
        """Sans token → 401"""
        client = APIClient()
        response = client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)