import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status
from apps.commandes.views import DonneeVenteViewSet
from apps.catalogue.models import Product, ProduitDv
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(username='admin') if User.objects.filter(username='admin').exists() else User.objects.first()
dv = ProduitDv.objects.first()
p = Product.objects.first()

factory = APIRequestFactory()
view = DonneeVenteViewSet.as_view({'post': 'create'})

data_pr = {
    'utilisateur': user.id if user else None,
    'canal_vente': 'Direct',
    'lignes_data': [
        {'produit': p.id if p else None, 'produit_dv': None, 'quantite': 1, 'prix_unitaire': 100}
    ]
}

request_pr = factory.post('/api/commandes/donnee-vente/', data_pr, format='json')
force_authenticate(request_pr, user=user)
response_pr = view(request_pr)
print(f"Status Vente (Product): {response_pr.status_code}")
if response_pr.status_code != 201:
    print(f"Response Data: {response_pr.data}")

data_dv = {
    'utilisateur': user.id if user else None,
    'canal_vente': 'Direct',
    'lignes_data': [
        {'produit': dv.product.id if dv and dv.product else None, 'produit_dv': dv.id if dv else None, 'quantite': 1, 'prix_unitaire': 100}
    ]
}
request_dv = factory.post('/api/commandes/donnee-vente/', data_dv, format='json')
force_authenticate(request_dv, user=user)
response_dv = view(request_dv)
print(f"Status Vente (Sub-product): {response_dv.status_code}")
if response_dv.status_code != 201:
    print(f"Response Data: {response_dv.data}")
