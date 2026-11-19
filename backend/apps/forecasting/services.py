"""
Données d'entrée des prévisions, extraites de la commande `prevision` pour être testables sans
les bibliothèques de machine learning (pandas, scikit-learn, xgboost, lightgbm).

Toutes les requêtes portent sur les mouvements de stock EFFECTIFS (`MouvementStock.effectifs()`) :
un achat ou une vente annulé(e) laisse deux mouvements (l'original et son inverse) qui ne doivent
compter ni comme demande ni comme approvisionnement.
"""
from datetime import timedelta

from django.db.models import Sum

from apps.stock.models import MouvementStock


def historique_journalier(produit, date_debut):
    """
    Entrées et sorties d'un produit agrégées par jour depuis `date_debut`.

    Retourne `{date: {"entree": x, "sortie": y}}` ; dictionnaire vide si aucun mouvement effectif.

    NB (comportement historique, conservé) : tout mouvement qui n'est pas une entrée « IN » est
    compté comme une sortie — y compris RETURN, ADJUSTMENT et ALLOCATION. Cela fausse la demande dès
    que ces types sont utilisés ; à revoir avec la gestion des retours et des rebuts.
    """
    mouvements = MouvementStock.effectifs().filter(
        produit=produit,
        timestamp__date__gte=date_debut,
    ).values("timestamp__date", "movement_type", "quantity")

    records = {}
    for m in mouvements:
        jour = m["timestamp__date"]
        if jour not in records:
            records[jour] = {"entree": 0, "sortie": 0}
        if m["movement_type"] == "IN":
            records[jour]["entree"] += m["quantity"]
        else:
            records[jour]["sortie"] += m["quantity"]
    return records


def taux_journaliers(produit, today, jours=90):
    """
    Taux moyens d'entrée et de sortie par jour sur les `jours` derniers jours
    (uniquement les mouvements « IN » et « OUT » effectifs). Retourne `(taux_entree, taux_sortie)`.
    """
    date_debut = today - timedelta(days=jours)

    def total(type_mouvement):
        return MouvementStock.effectifs().filter(
            produit=produit, movement_type=type_mouvement, timestamp__date__gte=date_debut,
        ).aggregate(total=Sum('quantity'))['total'] or 0

    return total('IN') / jours, total('OUT') / jours
