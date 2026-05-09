import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status
from apps.commandes.views import BCViewSet
from apps.catalogue.models import Product, Supplier, ProduitDv
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(username='admin') if User.objects.filter(username='admin').exists() else User.objects.first()
s = Supplier.objects.first()
dv = ProduitDv.objects.first()

factory = APIRequestFactory()
data = {
    'fournisseur': s.id if s else None,
    'utilisateur': user.id if user else None,
    'lignes_data': [
        {'produit': dv.product.id if dv and dv.product else None, 
         'produit_dv': dv.id if dv else None, 
         'quantite': 1, 'prix_unitaire': 100}
    ]
}

request = factory.post('/api/commandes/bon-commande/', data, format='json')
force_authenticate(request, user=user)
view = BCViewSet.as_view({'post': 'create'})
response = view(request)

print(f"Status (Sub-product): {response.status_code}")
if response.status_code != 201:
    print(f"Response Data: {response.data}")

# Test with Product
p = Product.objects.first()
data_pr = {
    'fournisseur': s.id if s else None,
    'utilisateur': user.id if user else None,
    'lignes_data': [
        {'produit': p.id if p else None, 'produit_dv': None, 'quantite': 1, 'prix_unitaire': 100}
    ]
}
request_pr = factory.post('/api/commandes/bon-commande/', data_pr, format='json')
force_authenticate(request_pr, user=user)
response_pr = view(request_pr)
print(f"Status (Product): {response_pr.status_code}")
if response_pr.status_code != 201:
    print(f"Response Data: {response_pr.data}")
