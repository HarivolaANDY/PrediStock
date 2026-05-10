from rest_framework import serializers
from .models import Role
from apps.accounts.models import User
import secrets
import string
import uuid


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'first_name', 'last_name', 'email', 'phone',
            'created_at', 'role', 'department', 'location', 'status',
            'permissions', 'biography', 'updated_at', 'avatar'
        )
        read_only_fields = ('id', 'created_at', 'username')


class RegisterSerializer(serializers.ModelSerializer):
    temporaryPassword = serializers.BooleanField(default=True, required=False)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=False)  # ← ajouter
    permissions = serializers.ListField(
        child=serializers.CharField(), allow_empty=True, required=False
    )

    class Meta:
        model = User
        fields = (
            'email', 'first_name', 'last_name', 'phone', 'role', 'department',
            'location', 'status', 'permissions', 'temporaryPassword',
            'biography', 'password'  # ← ajouter
        )

    def validate_email(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError(
                "L'email est obligatoire et ne peut pas être vide."
            )
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "Un utilisateur avec cet email existe déjà."
            )
        return value

    def validate_role(self, value):
        valid_roles = ["Administrateur", "Gestionnaire de Stock", "Analyste de Données", "Utilisateur", "Invité"]
        if value not in valid_roles:
            raise serializers.ValidationError(
                f"Le rôle doit être l'un des suivants : {valid_roles}"
            )
        return value

    def validate_permissions(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "Les permissions doivent être une liste de chaînes."
            )
        valid_permissions = [
            'dashboard_view', 'inventory_view', 'forecasting_view', 'reports_generate',
            'user_management', 'system_settings', 'data_import', 'models_configure'
        ]
        for perm in value:
            if perm not in valid_permissions:
                raise serializers.ValidationError(f"Permission non valide : {perm}")
        return value

    # apps/accounts/serializers.py — dans create()
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        temporary_password = None

        if validated_data.get('temporaryPassword', False):
            temporary_password = ''.join(
                secrets.choice(string.ascii_letters + string.digits) for _ in range(12)
            )
        elif password:
            temporary_password = None  # mot de passe fourni directement
        else:
            raise serializers.ValidationError(
                {"password": "Un mot de passe ou temporaryPassword=True est requis."}
            )

        user = User(
            email=validated_data['email'],
            username=str(uuid.uuid4())[:30],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone=validated_data.get('phone') or None,
            role=validated_data.get('role', 'Utilisateur'),
            department=validated_data.get('department', ''),
            location=validated_data.get('location', ''),
            status=validated_data.get('status', 'active'),
            permissions=','.join(validated_data.get('permissions', [])),
            temporaryPassword=validated_data.get('temporaryPassword', False),
            biography=validated_data.get('biography', ''),
        )
        user.set_password(password or temporary_password)
        user.save()
        return user, temporary_password
    
class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'