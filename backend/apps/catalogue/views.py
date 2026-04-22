import os
from datetime import date
from django.conf import settings

from django.db import transaction
from django.db.models import Sum, F, Q
from django.http import FileResponse
from django_filters.rest_framework import DjangoFilterBackend
from reportlab.lib import colors
from reportlab.lib.units import inch
from rest_framework import filters, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.core.views import GenericCRUDViewSet, PDFGeneratorViewSet
from apps.core.utils import StandardResponse
from apps.stock.models import MouvementStock, HistoriqueSeuilStock
from .filters import CategoryFilter, ProductFilter, SupplierFilter
from .models import Category, Supplier, Product, ProductImage, ProduitDv
from .serializers import (
    CategorySerializer, CategoryCreateSerializer,
    CategoryUpdateSerializer, CategoryListSerializer,
    SupplierSerializer, ProductSerializer, ProduitDvSerializer,
)


class ProductPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


# ─── Category ───────────────────────────────────────────────
class CategoryViewSet(GenericCRUDViewSet):
    model = Category
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CategoryFilter
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'create':
            return CategoryCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return CategoryUpdateSerializer
        elif self.action == 'list':
            return CategoryListSerializer
        return CategorySerializer

    def get_queryset(self):
        qs = Category.objects.all()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ['true', '1'])
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "success": True,
            "message": "Liste des catégories récupérée avec succès",
            "data": serializer.data,
        })

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response({'success': True, 'data': self.get_serializer(instance).data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)  # ← laisse DRF gérer

        with transaction.atomic():
            category = serializer.save()

        return Response({
            'success': True,
            'message': f'Catégorie "{category.name}" créée avec succès',
            'data': CategorySerializer(category).data,
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()  # ← laisse Django gérer 404

        try:
            with transaction.atomic():
                serializer = self.get_serializer(instance, data=request.data, partial=partial)
                serializer.is_valid(raise_exception=True)
                category = serializer.save()
                return Response({
                    'success': True,
                    'message': f'Catégorie "{category.name}" mise à jour',
                    'data': CategorySerializer(category).data,
                })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e),
                'errors': getattr(e, 'detail', str(e)),
            }, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()  # ← important

        try:
            name, pk = instance.name, instance.id
            instance.delete()
            return Response({
                'success': True,
                'message': f'Catégorie "{name}" (ID: {pk}) supprimée.',
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'success': False, 'message': str(e)},
                            status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '').strip()
        qs = self.get_queryset().filter(
            Q(name__icontains=query) | Q(description__icontains=query)
        ) if query else self.get_queryset()
        return Response({
            'success': True, 'query': query,
            'count': qs.count(),
            'data': CategoryListSerializer(qs, many=True).data,
        })

    @action(detail=False, methods=['get'])
    def active(self, request):
        qs = self.get_queryset().filter(is_active=True)
        return Response({
            'success': True, 'count': qs.count(),
            'data': CategoryListSerializer(qs, many=True).data,
        })

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        category = self.get_object()  # ← enlève try ici

        try:
            category.is_active = not category.is_active
            category.save()
            etat = "activée" if category.is_active else "désactivée"
            return Response({
                'success': True,
                'message': f'Catégorie "{category.name}" {etat}.',
                'data': CategorySerializer(category).data,
            })
        except Exception as e:
            return Response({'success': False, 'message': str(e)},
                            status=status.HTTP_400_BAD_REQUEST)


# ─── Supplier ───────────────────────────────────────────────
class SupplierViewSet(GenericCRUDViewSet):
    model = Supplier
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = SupplierFilter

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = SupplierSerializer(queryset, many=True)
        return StandardResponse.render(
            data=serializer.data,
            message="Liste des objets",
            status_code=200
        )

    def _link_products(self, supplier, products_str):
        if products_str == '':
            # Chaîne vide = dissocier tous les produits
            supplier.products.clear()
            return
        names = [n.strip() for n in products_str.split(';') if n.strip()]
        matched = Product.objects.filter(name__in=names)
        supplier.products.set(matched)  # remplace tous les liens existants

    def create(self, request, *args, **kwargs):
        products_str = request.data.get('products', '')
        response = super().create(request, *args, **kwargs)
        supplier_id = response.data.get('data', {}).get('id')
        if supplier_id and products_str:
            try:
                supplier = Supplier.objects.get(id=supplier_id)
                self._link_products(supplier, products_str)
            except Supplier.DoesNotExist:
                pass
        return response

    def update(self, request, *args, **kwargs):
        products_str = request.data.get('products', '')
        instance = self.get_object()
        response = super().update(request, *args, **kwargs)
        self._link_products(instance, products_str)
        return response

# ─── Product ────────────────────────────────────────────────
class ProductViewSet(GenericCRUDViewSet):
    model = Product
    queryset = Product.objects.all().order_by('id')
    serializer_class = ProductSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = ProductPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = ProductFilter

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        total_stock = sum(p.current_stock for p in queryset)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            result = self.get_paginated_response(serializer.data)
            return StandardResponse.render(
                data={
                    'results': result.data['results'],
                    'count': result.data['count'],
                    'next': result.data['next'],
                    'previous': result.data['previous'],
                    'total_stock': total_stock,
                },
                message="Liste des produits récupérée avec succès",
                status_code=200
            )
        serializer = self.get_serializer(queryset, many=True)
        return StandardResponse.render(data=serializer.data, status_code=200)

    def create(self, request, *args, **kwargs):
        # Recherche rapide via POST si 'chercher' est présent
        if request.data.get('chercher'):
            qs = self.filter_queryset(
                Product.objects.filter(name__icontains=request.data['chercher'])
            )
            return StandardResponse.render(
                data=ProductSerializer(qs, many=True, context={'request': request}).data,
                status_code=200
            )
        data = request.data.copy()
        if 'est_perissable' in data:
            val = data['est_perissable']
            data['est_perissable'] = val.lower() == 'true' if isinstance(val, str) else bool(val)
        request._full_data = data

        produit = super().create(request, *args, **kwargs)
        if not produit:
            return StandardResponse.render(message="Erreur lors de la création.", status_code=400)

        product_id = produit.data.get('data', {}).get('id')
        if product_id:
            try:
                product_instance = Product.objects.get(id=product_id)
                for img_file in request.FILES.getlist('product_img'):
                    ProductImage.objects.create(product=product_instance, image=img_file)
                HistoriqueSeuilStock.objects.create(
                    produit=product_instance,
                    utilisateur=request.user,
                    ancien_seuil=0,
                    nouveau_seuil=int(data.get('stock_threshold', 0)),
                    raison="Création de produit",
                )
            except Exception as e:
                print(f"Erreur post-création : {e}")
        return produit

    @action(detail=False, methods=['get'])
    def stats(self, request):
        return StandardResponse.render(data={
            'total_produits': Product.objects.count(),
            'total_perissable': Product.objects.filter(est_perissable=True).count(),
            'total_non_perissable': Product.objects.filter(est_perissable=False).count(),
            'total_stock': sum(p.current_stock for p in Product.objects.all()),
            'total_kg': Product.objects.filter(
                unite_mesure__iexact='kg'
            ).aggregate(total=Sum('current_stock'))['total'],
            'total_pieces': Product.objects.filter(
                unite_mesure__in=['Pieces', 'pieces', 'pc']
            ).aggregate(total=Sum('current_stock'))['total'],
            'total_litres': Product.objects.filter(
                unite_mesure__in=['Litres', 'litres', 'L', 'l']
            ).aggregate(total=Sum('current_stock'))['total'],
            'total_stock_faible': Product.objects.filter(
                current_stock__lte=F('stock_threshold')
            ).count(),
            'total_stock_rupture': Product.objects.filter(current_stock=0).count(),
        }, message="Statistiques récupérées.", status_code=200)

    @action(detail=True, methods=['post'])
    def upload_image(self, request, pk=None):
        product = self.get_object()
        if 'product_img' not in request.FILES:
            return StandardResponse.render(message="Aucune image fournie.", status_code=400)
        if product.product_img and os.path.isfile(product.product_img.path):
            os.remove(product.product_img.path)
        product.product_img = request.FILES['product_img']
        product.save()
        return StandardResponse.render(
            data=ProductSerializer(product, context={'request': request}).data,
            message="Image mise à jour.", status_code=200
        )

    @action(detail=True, methods=['delete'])
    def remove_image(self, request, pk=None):
        product = self.get_object()
        if not product.product_img:
            return StandardResponse.render(message="Aucune image à supprimer.", status_code=400)
        if os.path.isfile(product.product_img.path):
            os.remove(product.product_img.path)
        product.product_img.delete(save=False)
        product.save()
        return StandardResponse.render(
            data=ProductSerializer(product, context={'request': request}).data,
            message="Image supprimée.", status_code=200
        )


# ─── ProduitDv ──────────────────────────────────────────────
class ProduitDvViewSet(GenericCRUDViewSet):
    model = ProduitDv
    serializer_class = ProduitDvSerializer

    def get_queryset(self):
        return ProduitDv.objects.select_related('product').all()

    # Dans _generer_pdf_mouvement — sauvegardez le PDF et retournez l'URL
    def _generer_pdf_mouvement(self, mouvements, type_mouvement, request):
        titre_type = "sorties" if type_mouvement == "OUT" else "entrees"
        
        data = [["Produit", "Quantité", "Date", "Référence", "Utilisateur"]] + [
            [
                m.produit.name if m.produit else '',
                m.quantity,
                m.date.strftime("%Y-%m-%d") if m.date else '',
                m.referrence or '',
                m.utilisateur.get_full_name().upper() if m.utilisateur else '',
            ]
            for m in mouvements
        ]
        
        infos = {
            "titre": f"Rapport de {titre_type} de produits",
            "sous_titre": f"Rapport des {titre_type} de produits.",
            "auteur": request.user.get_full_name().upper() or request.user.username.upper(),
            "couleur": colors.lightgoldenrodyellow if type_mouvement == "OUT" else colors.lightgreen,
            "colWidths": [2*inch, inch, inch, 2*inch, 1.5*inch],
        }
        
        buffer = PDFGeneratorViewSet()._advanced_pdf(data=data, infos=infos)
        
        filename = f"Rapport_{titre_type}_{date.today()}.pdf"
        filepath = os.path.join(settings.MEDIA_ROOT, 'rapports', filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            f.write(buffer.read())

        file_url = request.build_absolute_uri(
            f"{settings.MEDIA_URL}rapports/{filename}"
        )
        return StandardResponse.render(
            data={"url": file_url, "filename": filename},
            message="Opération enregistrée avec succès.",
            status_code=200
        )

    @action(detail=False, methods=['post'])
    def sortie(self, request):
        from apps.notifications.models import Notification
        mouvements = []
        for pod in request.data.get('liste_sortie', []):
            produit_mere = Product.objects.get(pk=pod['id_produit'])
            raison = request.data.get('raison', 'Sortie via interface')
            for item in pod['panier']:
                try:
                    dv = ProduitDv.objects.get(pk=item['id'])
                    dv.nombre -= item['quantite']
                    if dv.nombre < 0:
                        return StandardResponse.render(
                            message=f"Stock insuffisant pour {item['designation']}.",
                            status_code=400
                        )
                    dv.save()
                    produit_mere.current_stock -= dv.quantite * item['quantite']
                    produit_mere.save()
                    Notification.creer(
                        utilisateur=request.user,
                        data={"objet_nom": f"Produit-{produit_mere.name}",
                              "model_name": "Product", "notif": "sortie(e)"},
                        titre="Sortie de produit",
                    )
                    mouvements.append(MouvementStock.objects.create(
                        produit=produit_mere, produit_dv=dv,
                        movement_type="OUT", quantity=item['quantite'],
                        unit_price=produit_mere.price, utilisateur=request.user,
                        notes=f"Sortie de {item['quantite']} unités de {item['designation']}",
                        referrence=item.get('ref', ''), reason=raison,
                    ))
                except Exception as e:
                    return StandardResponse.render(message=f"Erreur : {e}", status_code=500)
        return self._generer_pdf_mouvement(mouvements, "OUT", request)

    @action(detail=False, methods=['post'])
    def entree(self, request):
        from apps.notifications.models import Notification
        mouvements = []
        for pod in request.data.get('liste_inserer', []):
            produit = Product.objects.get(pk=pod['id_produit'])
            for item in pod['panier']:
                try:
                    dv = ProduitDv.objects.get(pk=item['id'])
                    dv.nombre += item['nombre']
                    dv.save()
                    produit.current_stock += dv.quantite * item['nombre']
                    produit.save()
                    Notification.creer(
                        utilisateur=request.user,
                        data={"objet_nom": f"Produit-{produit.name}",
                              "model_name": "Product", "notif": "inséré(e)"},
                        titre="Entrée de produit",
                    )
                    mouvements.append(MouvementStock.objects.create(
                        produit=produit, produit_dv=dv,
                        movement_type="IN", quantity=item['nombre'],
                        unit_price=produit.price, utilisateur=request.user,
                        notes=f"Entrée de {item['nombre']} unités de {item['designation']}",
                        referrence=item.get('ref', ''),
                    ))
                except Exception as e:
                    return StandardResponse.render(message=f"Erreur : {e}", status_code=500)
        return self._generer_pdf_mouvement(mouvements, "IN", request)

    @action(detail=False, methods=['get'])
    def par_produit(self, request):
        product_id = request.query_params.get('product')
        if not product_id:
            return StandardResponse.render(message="Paramètre 'product' requis.", status_code=400)
        qs = self.get_queryset().filter(product__id=product_id)
        return StandardResponse.render(
            data=ProduitDvSerializer(qs, many=True).data, status_code=200
        )