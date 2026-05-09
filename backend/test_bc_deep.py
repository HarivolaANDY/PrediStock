import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status
from apps.commandes.views import BCViewSet
from apps.catalogue.models import Product, Supplier
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(username='admin') if User.objects.filter(username='admin').exists() else User.objects.first()
s = Supplier.objects.first()
p = Product.objects.first()

factory = APIRequestFactory()
view = BCViewSet.as_view({'post': 'create'})

data = {
    'fournisseur': s.id if s else None,
    'utilisateur': user.id if user else None,
    'lignes_data': [
        {'produit': p.id if p else None, 'produit_dv': None, 'quantite': 1, 'prix_unitaire': 100}
    ]
}

request = factory.post('/api/commandes/bon-commande/', data, format='json')
force_authenticate(request, user=user)
response = view(request)

print(f"Status: {response.status_code}")
if response.status_code != 201:
    print(f"Response Data: {response.data}")
else:
    print(f"Created ID: {response.data['id']}")
    print(f"Lignes: {response.data['lignes']}")
