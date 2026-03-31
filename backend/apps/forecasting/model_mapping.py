from apps.catalogue.models import Product, Category, Supplier
from apps.stock.models import MouvementStock

# Generer est supprimé — les mouvements sont directement dans MouvementStock
# GenererSchema dans schemas.py crée désormais des MouvementStock directement
MODEL_MAPPING = {
    "produit":   Product,
    "categorie": Category,
    "generer":   MouvementStock,  # ancien Generer → maintenant MouvementStock
    "supplier":  Supplier,
}