#import json

from django.contrib.auth import authenticate
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.emailor import send_email_to_user
from apps.core.views import GenericCRUDViewSet
from apps.core.utils import StandardResponse
from apps.notifications.models import Notification
from .models import User, Role
from .serializers import UserSerializer, RegisterSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user, temp_password = serializer.save()

            # Notification seulement si un user est connecté (admin qui crée un compte)
            if request.user.is_authenticated:
                Notification.creer(
                    utilisateur=request.user,
                    data={
                        "objet_nom": f"{user.last_name} {user.first_name}",
                        "model_name": "User",
                        "notif": "Crée",
                    },
                    priorite=1,
                    channel="email",
                    type_notification="User",
                    titre="Nouvel utilisateur",
                )

            token, _ = Token.objects.get_or_create(user=user)
            response_data = {
                'token': token.key,
                'user': UserSerializer(user).data,
            }
            if temp_password:
                try:
                    send_email_to_user(
                        email_receiver=user.email,
                        temp_password=temp_password
                    )
                    response_data['temporary_password'] = temp_password
                except Exception as e:
                    response_data['warning'] = f"Échec de l'envoi de l'email : {str(e)}"

            return StandardResponse.render(
                data=response_data,
                message='Utilisateur créé avec succès.',
                status_code=status.HTTP_201_CREATED
            )

        return StandardResponse.render(
            data=serializer.errors,
            message="Données invalides.",
            status_code=status.HTTP_400_BAD_REQUEST
        )


class ExternalLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return StandardResponse.render(
                message='Email ou mot de passe incorrect.',
                status_code=status.HTTP_401_UNAUTHORIZED
            )

        authenticated = authenticate(request, username=user.username, password=password)
        if authenticated is None:
            return StandardResponse.render(
                message='Email ou mot de passe incorrect.',
                status_code=status.HTTP_401_UNAUTHORIZED
            )

        authenticated.last_login = timezone.now()
        authenticated.save(update_fields=['last_login'])
        token, _ = Token.objects.get_or_create(user=authenticated)
        return StandardResponse.render(
            data={
                'token': token.key,
                'user': UserSerializer(authenticated).data,
            },
            message='Authentification réussie.',
            status_code=status.HTTP_200_OK
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            request.user.auth_token.delete()
            return StandardResponse.render(message='Déconnexion réussie.', status_code=status.HTTP_200_OK)
        except Exception:
            return StandardResponse.render(
                message='Erreur lors de la déconnexion.',
                status_code=status.HTTP_400_BAD_REQUEST
            )


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return StandardResponse.render(
            data=UserSerializer(request.user).data,
            message="Profil récupéré",
            status_code=status.HTTP_200_OK
        )


class CheckAvailabilityView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        errors = []
        response_data = {}

        email = request.data.get('email')
        phone = request.data.get('phone')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')

        if email and User.objects.filter(email=email).exists():
            response_data['email_available'] = False
            errors.append('Cet email est déjà utilisé.')

        if phone and User.objects.filter(phone=phone).exists():
            response_data['phone_available'] = False
            errors.append('Ce numéro de téléphone est déjà utilisé.')

        if first_name and last_name and User.objects.filter(
            first_name=first_name, last_name=last_name
        ).exists():
            response_data['name_available'] = False
            errors.append('Cette combinaison nom/prénom est déjà utilisée.')

        response_data['errors'] = errors
        return StandardResponse.render(
            data=response_data,
            message='Vérification effectuée' if not errors else 'Données déjà utilisées',
            status_code=status.HTTP_400_BAD_REQUEST if errors else status.HTTP_200_OK
        )


class TestEmail(APIView):
    def get(self, request):
        try:
            utilisateur = User.objects.get(email="azertyqwerton@gmail.com")
            return Response({'message': f'Got {utilisateur.first_name}'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)