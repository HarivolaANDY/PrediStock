import os
import django
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.stock.models import MouvementStock
from apps.commandes.models import BonCommande, DonneeVente
from django.db import transaction

try:
    with transaction.atomic():
        # Complete wipe of movemements and commerce data
        m_count = MouvementStock.objects.count()
        MouvementStock.objects.all().delete()
        
        bc_count = BonCommande.objects.count()
        BonCommande.objects.all().delete()
        
        dv_count = DonneeVente.objects.count()
        DonneeVente.objects.all().delete()
        
        print(f"Deleted {m_count} movements.")
        print(f"Deleted {bc_count} purchase orders.")
        print(f"Deleted {dv_count} sales.")
        print("All transaction-related data has been successfully cleared.")
except Exception as e:
    print(f"Error: {e}")
