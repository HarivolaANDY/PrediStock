from django.conf import settings
from rest_framework import serializers
from .models import Category, Supplier, Product, ProductImage, ProduitDv


# ─── Category ───────────────────────────────────────────────
class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.ReadOnlyField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'description', 'is_active',
            'product_count', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'id': {'required': False},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'description': {'required': False},
        }

    # Dans CategorySerializer.validate_name
    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le nom ne peut pas être vide.")

        cleaned = value.strip()

        # Normalisation explicite en minuscules pour gérer les accents
        qs = Category.objects.filter(name__iexact=cleaned)
        if not qs.exists():
            # Double vérification avec lower() Python pour SQLite
            qs = Category.objects.all()
            qs = [c for c in qs if c.name.lower() == cleaned.lower()]
            if qs:
                if not (self.instance and self.instance.pk == qs[0].pk):
                    raise serializers.ValidationError(
                        "Une catégorie avec ce nom existe déjà."
                    )
        else:
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    "Une catégorie avec ce nom existe déjà."
                )

        return cleaned


class CategoryCreateSerializer(CategorySerializer):
    class Meta(CategorySerializer.Meta):
        fields = ['name', 'description']
        extra_kwargs = {
            'name': {'required': True},
            'description': {'required': False, 'default': ''},
        }

class CategoryUpdateSerializer(CategorySerializer):
    class Meta(CategorySerializer.Meta):
        fields = ['name', 'description', 'is_active']


class CategoryListSerializer(serializers.ModelSerializer):
    product_count = serializers.ReadOnlyField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'is_active', 'product_count', 'created_at']


# ─── Supplier ───────────────────────────────────────────────
class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'


# ─── Product ────────────────────────────────────────────────
class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'created_at']


class InfoProduitMereSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'category', 'unite_mesure']


class ProduitDvSerializer(serializers.ModelSerializer):
    infos = InfoProduitMereSerializer(source='product', read_only=True)

    class Meta:
        model = ProduitDv
        fields = '__all__'
        read_only_fields = ('id', 'date_creation')
        extra_kwargs = {
            'product': {'required': True}
        }


class ProductSerializer(serializers.ModelSerializer):
    product_img = serializers.ImageField(required=False, allow_null=True)
    est_perissable = serializers.BooleanField(required=False, default=False)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
        
    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le nom est requis.")

        cleaned = value.strip()
        qs = Product.objects.filter(name__iexact=cleaned)

        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError("Un produit avec ce nom existe déjà.")

        return cleaned

    def get_image_url(self, obj):
        if not obj.product_img:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.product_img.url)
        return f"{settings.MEDIA_URL}{obj.product_img}"

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['image_url'] = self.get_image_url(instance)
        if instance.product_img:
            try:
                rep['product_img'] = self.get_image_url(instance)
                rep['image_info'] = {
                    'name': instance.product_img.name,
                    'url': self.get_image_url(instance),
                    'size': instance.product_img.size if hasattr(instance.product_img, 'size') else None,
                }
            except Exception as e:
                rep['image_error'] = str(e)
        return rep

    def validate_product_img(self, value):
        if value:
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("L'image ne doit pas dépasser 5MB.")
            if value.content_type not in ['image/jpeg', 'image/png', 'image/webp']:
                raise serializers.ValidationError("Formats acceptés : JPEG, PNG, WebP.")
        return value

    def update(self, instance, validated_data):
        if 'product_img' in validated_data and instance.product_img:
            instance.product_img.delete(save=False)
        return super().update(instance, validated_data)