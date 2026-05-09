import os
import traceback
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
from rest_framework.decorators import parser_classes as parser_classes_decorator
from rest_framework.pagination import PageNumberPagination
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
        return StandardResponse.render(
            data=serializer.data,
            message="Liste des catégories récupérée avec succès",
            status_code=200
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return StandardResponse.render(
            data=self.get_serializer(instance).data,
            message="Catégorie récupérée",
            status_code=200
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            category = serializer.save()
        return StandardResponse.render(
            data=CategorySerializer(category).data,
            message=f'Catégorie "{category.name}" créée avec succès',
            status_code=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.FILES.getlist('product_img'):
            instance.images.all().delete()
            if instance.product_img:
                instance.product_img.delete(save=False)
                instance.product_img = None
                instance.save()
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            name, pk = instance.name, instance.id
            instance.delete()
            return StandardResponse.render(
                message=f'Catégorie "{name}" (ID: {pk}) supprimée.',
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return Response({'success': False, 'message': str(e)},
                            status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '').strip()
        qs = self.get_queryset().filter(
            Q(name__icontains=query) | Q(description__icontains=query)
        ) if query else self.get_queryset()
        return StandardResponse.render(
            data=CategoryListSerializer(qs, many=True).data,
            message=f"Recherche effectuée pour '{query}'",
            status_code=200
        )

    @action(detail=False, methods=['get'])
    def active(self, request):
        qs = self.get_queryset().filter(is_active=True)
        return StandardResponse.render(
            data=CategoryListSerializer(qs, many=True).data,
            message="Liste des catégories actives",
            status_code=200
        )

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        category = self.get_object()
        try:
            category.is_active = not category.is_active
            category.save()
            etat = "activée" if category.is_active else "désactivée"
            return StandardResponse.render(
                data=CategorySerializer(category).data,
                message=f'Catégorie "{category.name}" {etat}.',
                status_code=200
            )
        except Exception as e:
            return StandardResponse.render(
                message=str(e),
                status_code=status.HTTP_400_BAD_REQUEST
            )


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
            supplier.products.clear()
            return
        names = [n.strip() for n in products_str.split(';') if n.strip()]
        matched = Product.objects.filter(name__in=names)
        supplier.products.set(matched)

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
        # ─── Recherche combinée produits parents + dérivées ───────────────
        if 'chercher' in request.data:
            terme = request.data['chercher']

            # Produits parents qui matchent
            produits_qs = Product.objects.filter(name__icontains=terme)
            produits_data = ProductSerializer(
                produits_qs, many=True, context={'request': request}
            ).data
            for p in produits_data:
                p['is_deriv'] = False
                p['parent_id'] = None
                p['parent_name'] = None
                # Assurer que le prix est un nombre pour le frontend
                try:
                    p['price'] = float(p.get('price') or 0)
                except:
                    p['price'] = 0

            # Dérivées qui matchent
            derivees_qs = ProduitDv.objects.select_related('product').filter(
                designation__icontains=terme
            )
            derivees_data = [
                {
                    'id': dv.id,
                    'name': dv.designation,
                    'price': float(dv.product.price or 0) if dv.product else 0,
                    'is_deriv': True,
                    'parent_name': dv.product.name if dv.product else "N/A",
                    'parent_id': dv.product.id if dv.product else None,
                }
                for dv in derivees_qs
            ]

            return StandardResponse.render(
                data=list(produits_data) + derivees_data,
                status_code=200
            )

        # ─── Création normale ─────────────────────────────────────────────
        data = request.data.copy()
        if 'est_perissable' in data:
            val = data['est_perissable']
            data['est_perissable'] = val.lower() == 'true' if isinstance(val, str) else bool(val)

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

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            product_id = instance.id
            product_name = instance.name

            for pi in instance.images.all():
                try:
                    if pi.image and hasattr(pi.image, 'path') and os.path.isfile(pi.image.path):
                        os.remove(pi.image.path)
                except Exception as e:
                    print(f"[destroy] Erreur suppression image {pi.id}: {e}")
            instance.images.all().delete()

            if instance.product_img:
                try:
                    if hasattr(instance.product_img, 'path') and os.path.isfile(instance.product_img.path):
                        os.remove(instance.product_img.path)
                except Exception as e:
                    print(f"[destroy] Erreur suppression product_img: {e}")
                instance.product_img.delete(save=False)

            instance.produitdv_set.all().delete()
            HistoriqueSeuilStock.objects.filter(produit=instance).delete()
            MouvementStock.objects.filter(produit=instance).update(produit=None)
            instance.delete()

            return StandardResponse.render(
                message=f'Produit "{product_name}" supprimé.',
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"[destroy] ERREUR: {str(e)}")
            traceback.print_exc()
            return StandardResponse.render(
                message=f"Erreur lors de la suppression: {str(e)}",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        all_products = list(Product.objects.all())

        total_rupture = 0
        total_critique = 0
        total_stock_faible = 0

        for p in all_products:
            if p.current_stock == 0:
                total_rupture += 1
            elif p.stock_threshold > 0:
                ratio = p.current_stock / p.stock_threshold
                if ratio <= 0.25:
                    total_critique += 1
                elif ratio <= 0.50:
                    total_stock_faible += 1

        return StandardResponse.render(data={
            'total_produits': Product.objects.count(),
            'total_perissable': Product.objects.filter(est_perissable=True).count(),
            'total_non_perissable': Product.objects.filter(est_perissable=False).count(),
            'total_stock': sum(p.current_stock for p in all_products),
            'total_stock_value': sum(p.current_stock * (p.price or 0) for p in all_products),
            'total_kg': Product.objects.filter(
                unite_mesure__iexact='kg'
            ).aggregate(total=Sum('current_stock'))['total'],
            'total_pieces': Product.objects.filter(
                unite_mesure__in=['Pieces', 'pieces', 'pc']
            ).aggregate(total=Sum('current_stock'))['total'],
            'total_litres': Product.objects.filter(
                unite_mesure__in=['Litres', 'litres', 'L', 'l']
            ).aggregate(total=Sum('current_stock'))['total'],
            'total_stock_faible': total_stock_faible,
            'total_stock_critique': total_critique,
            'total_stock_rupture': total_rupture,
        }, message="Statistiques récupérées.", status_code=200)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request, pk=None):
        product = self.get_object()

        if 'product_img' not in request.FILES:
            return StandardResponse.render(message="Aucune image fournie.", status_code=400)

        files = request.FILES.getlist('product_img')
        is_first_upload = not product.product_img

        for index, img_file in enumerate(files):
            if index == 0 and is_first_upload:
                product.product_img = img_file
                product.save()
            else:
                ProductImage.objects.create(product=product, image=img_file)

        return StandardResponse.render(
            data=ProductSerializer(product, context={'request': request}).data,
            message=f"{len(files)} image(s) ajoutée(s).",
            status_code=200
        )

    @action(detail=True, methods=['delete'])
    def remove_image(self, request, pk=None):
        product = self.get_object()

        for pi in product.images.all():
            try:
                if pi.image and hasattr(pi.image, 'path') and os.path.isfile(pi.image.path):
                    os.remove(pi.image.path)
            except Exception as e:
                print(f"[remove_image] Erreur suppression fichier ProductImage {pi.id}: {e}")

        product.images.all().delete()

        if product.product_img:
            try:
                if hasattr(product.product_img, 'path') and os.path.isfile(product.product_img.path):
                    os.remove(product.product_img.path)
            except Exception as e:
                print(f"[remove_image] Erreur suppression product_img: {e}")

            product.product_img.delete(save=False)
            product.product_img = None
            product.save(update_fields=['product_img'])

        return StandardResponse.render(
            data=ProductSerializer(product, context={'request': request}).data,
            message="Toutes les images supprimées.",
            status_code=200
        )


# ─── ProduitDv ──────────────────────────────────────────────
class ProduitDvViewSet(GenericCRUDViewSet):
    model = ProduitDv
    serializer_class = ProduitDvSerializer

    def get_queryset(self):
        return ProduitDv.objects.select_related('product').all()

    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product')
        designation = request.data.get('designation')

        try:
            quantity_to_allocate = float(request.data.get('stock_initial', 0) or 0)
        except (ValueError, TypeError):
            quantity_to_allocate = 0

        if not product_id:
            return StandardResponse.render(message="Produit parent requis.", status_code=400)

        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return StandardResponse.render(message="Produit parent introuvable.", status_code=404)

        if quantity_to_allocate > 0:
            if product.unassigned_stock < quantity_to_allocate:
                return StandardResponse.render(
                    message=f"Stock insuffisant pour cette allocation. Disponible (non-alloué) : {product.unassigned_stock} {product.unite_mesure}.",
                    status_code=400
                )

        try:
            with transaction.atomic():
                # Créer le ProduitDv avec nombre initial = 0
                serializer = self.get_serializer(data={
                    'product': product_id,
                    'designation': designation or 'Sans désignation',
                })
                serializer.is_valid(raise_exception=True)
                dv = serializer.save(nombre=0)

                if quantity_to_allocate > 0:
                    MouvementStock.objects.create(
                        produit=product,
                        produit_dv=dv,
                        movement_type='ALLOCATION',
                        quantity=int(quantity_to_allocate),
                        utilisateur=request.user,
                        notes=f"Allocation initiale de {quantity_to_allocate} {product.unite_mesure} pour '{dv.designation}'"
                    )
        except Exception as e:
            import traceback
            traceback.print_exc()
            return StandardResponse.render(
                message=f"Erreur lors de la création du sous-produit : {str(e)}",
                status_code=500
            )

        return StandardResponse.render(
            data=ProduitDvSerializer(dv).data,
            message=f"Sous-produit '{dv.designation}' créé avec une allocation de {quantity_to_allocate} {product.unite_mesure}.",
            status_code=201
        )

    def _generer_pdf_mouvement(self, mouvements, type_mouvement, request):
        titre_type = "sorties" if type_mouvement == "OUT" else "entrees"
        data = [["Produit", "Quantité", "Date", "Référence", "Utilisateur"]] + [
            [
                m.produit.name if m.produit else '',
                m.quantity,
                m.timestamp.strftime("%Y-%m-%d") if m.timestamp else '',
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
        file_url = request.build_absolute_uri(f"{settings.MEDIA_URL}rapports/{filename}")
        return StandardResponse.render(
            data={"url": file_url, "filename": filename},
            message="Opération enregistrée avec succès.",
            status_code=200
        )

    @action(detail=False, methods=['post'])
    def entree(self, request):
        from apps.notifications.models import Notification
        mouvements = []
        for pod in request.data.get('liste_inserer', []):
            try:
                produit = Product.objects.get(pk=pod['id_produit'])
            except Product.DoesNotExist:
                return StandardResponse.render(
                    message=f"Produit ID {pod['id_produit']} introuvable.",
                    status_code=400
                )

            for item in pod['panier']:
                try:
                    if item.get('is_direct'):
                        # ── Produit sans dérivée : on incrémente directement le stock parent ──
                        nombre = item['nombre']
                        # Suppression de la mise à jour manuelle (produit.current_stock += nombre)
                        # car le signal 'update_stock_on_mouvement' s'en charge à la création du MouvementStock.
                        Notification.creer(
                            utilisateur=request.user,
                            data={
                                "objet_nom": f"Produit-{produit.name}",
                                "model_name": "Product",
                                "notif": "inséré(e)",
                            },
                            titre="Entrée de produit",
                        )
                        mouvements.append(MouvementStock.objects.create(
                            produit=produit,
                            produit_dv=None,
                            movement_type="IN",
                            quantity=nombre,
                            unit_price=produit.price,
                            utilisateur=request.user,
                            notes=f"Entrée directe de {nombre} unités de {produit.name}",
                            referrence=item.get('ref', ''),
                        ))
                    else:
                        # ── Produit avec dérivée ──────────────────────────────────────────────
                        dv = ProduitDv.objects.get(pk=item['id'])
                        
                        # Note: 'nombre' in item is the WEIGHT (kg) or parent base unit
                        weight = item.get('nombre', 0)
                        
                        # Suppression de la mise à jour manuelle car gérée par signal
                        Notification.creer(
                            utilisateur=request.user,
                            data={
                                "objet_nom": f"Produit-{produit.name}",
                                "model_name": "Product",
                                "notif": "inséré(e)",
                            },
                            titre="Entrée de produit",
                        )
                        mouvements.append(MouvementStock.objects.create(
                            produit=produit,
                            produit_dv=dv,
                            movement_type="IN",
                            quantity=weight,
                            unit_price=produit.price,
                            utilisateur=request.user,
                            notes=f"Entrée de {weight} {produit.unite_mesure} de {item['designation']}",
                            referrence=item.get('ref', ''),
                        ))
                except ProduitDv.DoesNotExist:
                    return StandardResponse.render(
                        message=f"Dérivée ID {item.get('id')} introuvable.",
                        status_code=400
                    )
                except Exception as e:
                    return StandardResponse.render(message=f"Erreur : {e}", status_code=500)

        return self._generer_pdf_mouvement(mouvements, "IN", request)

    @action(detail=False, methods=['post'])
    def sortie(self, request):
        from apps.notifications.models import Notification
        mouvements = []
        raison = request.data.get('raison', 'Sortie via interface')

        for pod in request.data.get('liste_sortie', []):
            try:
                produit_mere = Product.objects.get(pk=pod['id_produit'])
            except Product.DoesNotExist:
                return StandardResponse.render(
                    message=f"Produit ID {pod['id_produit']} introuvable.",
                    status_code=400
                )

            for item in pod['panier']:
                try:
                    if item.get('is_direct'):
                        # ── Produit sans dérivée ──────────────────────────────────────────────
                        weight = item.get('quantite', 0)
                        # Le signal s'occupe de vérifier le stock et décrémenter
                        Notification.creer(
                            utilisateur=request.user,
                            data={
                                "objet_nom": f"Produit-{produit_mere.name}",
                                "model_name": "Product",
                                "notif": "sortie(e)",
                            },
                            titre="Sortie de produit",
                        )
                        mouvements.append(MouvementStock.objects.create(
                            produit=produit_mere,
                            produit_dv=None,
                            movement_type="OUT",
                            quantity=weight,
                            unit_price=produit_mere.price,
                            utilisateur=request.user,
                            notes=f"Sortie directe de {weight} {produit_mere.unite_mesure} de {produit_mere.name}",
                            referrence=item.get('ref', ''),
                            reason=raison,
                        ))
                    else:
                        # ── Produit avec dérivée ──────────────────────────────────────────────
                        dv = ProduitDv.objects.get(pk=item['id'])
                        
                        weight = item.get('quantite', 0)

                        # Suppression des calculs manuels
                        Notification.creer(
                            utilisateur=request.user,
                            data={
                                "objet_nom": f"Produit-{produit_mere.name}",
                                "model_name": "Product",
                                "notif": "sortie(e)",
                            },
                            titre="Sortie de produit",
                        )
                        mouvements.append(MouvementStock.objects.create(
                            produit=produit_mere,
                            produit_dv=dv,
                            movement_type="OUT",
                            quantity=weight,
                            unit_price=produit_mere.price,
                            utilisateur=request.user,
                            notes=f"Sortie de {weight} {produit_mere.unite_mesure} de {item['designation']}",
                            referrence=item.get('ref', ''),
                            reason=raison,
                        ))
                except ProduitDv.DoesNotExist:
                    return StandardResponse.render(
                        message=f"Dérivée ID {item.get('id')} introuvable.",
                        status_code=400
                    )
                except Exception as e:
                    return StandardResponse.render(message=f"Erreur : {e}", status_code=500)

        return self._generer_pdf_mouvement(mouvements, "OUT", request)

    @action(detail=False, methods=['get'])
    def par_produit(self, request):
        product_id = request.query_params.get('product')
        if not product_id:
            return StandardResponse.render(message="Paramètre 'product' requis.", status_code=400)
        qs = self.get_queryset().filter(product__id=product_id)
        return StandardResponse.render(
            data=ProduitDvSerializer(qs, many=True).data, status_code=200
        )


# ─── Revenues ───────────────────────────────────────────────
class RevenueViewSet(GenericCRUDViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def mensuel(self, request):
        from django.db.models.functions import ExtractMonth
        from collections import defaultdict

        month_names = {
            1: 'Jan', 2: 'Fév', 3: 'Mar', 4: 'Avr', 5: 'Mai', 6: 'Juin',
            7: 'Juil', 8: 'Août', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Déc'
        }

        sorties = (
            MouvementStock.objects
            .filter(movement_type='OUT', timestamp__isnull=False)
            .annotate(month=ExtractMonth('timestamp'))
            .select_related('produit', 'produit__category')
        )

        data_by_month = defaultdict(lambda: defaultdict(float))
        all_categories = set()

        for s in sorties:
            m_name = month_names.get(s.month, 'Inconnu')
            cat_name = (
                s.produit.category.name
                if s.produit and s.produit.category
                else 'Non catégorisé'
            )
            all_categories.add(cat_name)
            amount = float(s.quantity) * float(s.unit_price or 0)
            data_by_month[m_name][cat_name] += amount

        result = []
        sorted_months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
                         'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
        for m in sorted_months:
            if m in data_by_month:
                row = {'month': m}
                row.update(data_by_month[m])
                row['actual'] = sum(data_by_month[m].values())
                for cat in all_categories:
                    if cat not in row:
                        row[cat] = 0
                result.append(row)

        return StandardResponse.render(data=result, message='Revenus mensuels.', status_code=200)