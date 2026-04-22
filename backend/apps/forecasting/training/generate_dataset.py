# apps/forecasting/training/generate_dataset.py
import json, os

PRODUITS = [
    "Air Fryer", "Banane", "Riz", "Acoustic Guitar",
    "Almond Butter", "Air Mattress"
]

templates = [
    # Stock
    ("Quel est le stock de {p} ?",
     "SELECT p.name, p.current_stock, p.stock_threshold, p.unite_mesure FROM catalogue_product p WHERE LOWER(p.name) LIKE '%{pl}%' AND p.is_active = 1"),
    ("Combien reste-t-il de {p} en stock ?",
     "SELECT p.name, p.current_stock FROM catalogue_product p WHERE LOWER(p.name) LIKE '%{pl}%'"),
    ("Niveau de stock pour {p}",
     "SELECT p.name, p.current_stock, p.stock_threshold FROM catalogue_product p WHERE LOWER(p.name) LIKE '%{pl}%'"),
    ("Seuil minimum de {p}",
     "SELECT p.name, p.stock_threshold, p.current_stock FROM catalogue_product p WHERE LOWER(p.name) LIKE '%{pl}%'"),
    # Ventes
    ("Ventes de {p} ce mois",
     "SELECT p.name, SUM(dv.quantite_vendu) as total FROM commandes_donneevente dv JOIN commandes_produitdonneevente pdv ON pdv.donnee_vente_id = dv.id JOIN catalogue_product p ON pdv.produit_id = p.id WHERE LOWER(p.name) LIKE '%{pl}%' AND dv.date_vente >= date('now', '-30 days') GROUP BY p.name"),
    ("Combien de {p} vendus cette semaine ?",
     "SELECT p.name, SUM(dv.quantite_vendu) as total FROM commandes_donneevente dv JOIN commandes_produitdonneevente pdv ON pdv.donnee_vente_id = dv.id JOIN catalogue_product p ON pdv.produit_id = p.id WHERE LOWER(p.name) LIKE '%{pl}%' AND dv.date_vente >= date('now', '-7 days') GROUP BY p.name"),
    # Prédictions
    ("Prédiction pour {p}",
     "SELECT p.name, pred.date_prediction, pred.stock_prevu, pred.import_qty FROM forecasting_prediction pred JOIN catalogue_product p ON pred.product_id = p.id WHERE LOWER(p.name) LIKE '%{pl}%' ORDER BY pred.date_prediction ASC LIMIT 5"),
    ("Prévision de rupture pour {p}",
     "SELECT p.name, pred.date_prediction, pred.stock_prevu, pred.rupture FROM forecasting_prediction pred JOIN catalogue_product p ON pred.product_id = p.id WHERE LOWER(p.name) LIKE '%{pl}%' AND pred.rupture = 1"),
]

generiques = [
    ("Quels produits sont en rupture ?",
     "SELECT p.name, p.current_stock, p.stock_threshold FROM catalogue_product p WHERE p.current_stock <= p.stock_threshold AND p.is_active = 1 ORDER BY p.current_stock ASC"),
    ("Produits proches de la rupture",
     "SELECT p.name, p.current_stock, p.stock_threshold FROM catalogue_product p WHERE p.current_stock > p.stock_threshold AND p.current_stock <= p.stock_threshold * 1.5 AND p.is_active = 1"),
    ("Top 10 produits les plus vendus",
     "SELECT p.name, SUM(dv.quantite_vendu) as total FROM commandes_donneevente dv JOIN commandes_produitdonneevente pdv ON pdv.donnee_vente_id = dv.id JOIN catalogue_product p ON pdv.produit_id = p.id WHERE dv.date_vente >= date('now', '-30 days') GROUP BY p.name ORDER BY total DESC LIMIT 10"),
    ("Valeur totale du stock",
     "SELECT cat.name, ROUND(SUM(p.current_stock * p.price), 2) as valeur FROM catalogue_product p LEFT JOIN catalogue_category cat ON p.category_id = cat.id GROUP BY cat.name ORDER BY valeur DESC"),
    ("Taux de rotation des stocks",
     "SELECT p.name, ROUND(SUM(dv.quantite_vendu) * 1.0 / NULLIF(p.current_stock, 0), 2) as taux FROM catalogue_product p LEFT JOIN commandes_produitdonneevente pdv ON pdv.produit_id = p.id LEFT JOIN commandes_donneevente dv ON dv.id = pdv.donnee_vente_id GROUP BY p.id ORDER BY taux DESC LIMIT 15"),
    ("Mouvements de stock cette semaine",
     "SELECT p.name, m.movement_type, m.quantity, m.date FROM MOVEMENT_STOCK m JOIN catalogue_product p ON m.produit_id = p.id WHERE m.date >= date('now', '-7 days') ORDER BY m.date DESC"),
    ("Alertes non lues",
     "SELECT p.name, a.type_alert, a.priorite, a.message FROM notifications_alerte a JOIN catalogue_product p ON a.produit_id = p.id WHERE a.est_lu = 0"),
    ("Recommandations en attente",
     "SELECT p.name, r.type_recommandation, r.quantite_suggeree, r.priority FROM forecasting_recommandation r JOIN catalogue_product p ON r.product_id = p.id WHERE r.est_applique = 0"),
    ("Dernières commandes fournisseurs",
     "SELECT s.name, bc.numero_commande, bc.status, bc.date_commande FROM commandes_boncommande bc JOIN catalogue_supplier s ON bc.fournisseur_id = s.id ORDER BY bc.date_commande DESC LIMIT 10"),
    ("Produits qui ne se vendent pas",
     "SELECT p.name, p.current_stock FROM catalogue_product p LEFT JOIN commandes_produitdonneevente pdv ON pdv.produit_id = p.id LEFT JOIN commandes_donneevente dv ON dv.id = pdv.donnee_vente_id AND dv.date_vente >= date('now', '-90 days') WHERE p.is_active = 1 GROUP BY p.id HAVING COALESCE(SUM(dv.quantite_vendu), 0) = 0"),
]

# Générer les exemples
dataset = list(generiques)
for produit in PRODUITS:
    pl = produit.lower()
    for question_tpl, sql_tpl in templates:
        dataset.append({
            "question": question_tpl.replace("{p}", produit),
            "sql": sql_tpl.replace("{pl}", pl)
        })

output = os.path.join(os.path.dirname(__file__), "dataset.json")
with open(output, "w", encoding="utf-8") as f:
    json.dump(dataset, f, ensure_ascii=False, indent=2)

print(f"✅ {len(dataset)} exemples générés dans dataset.json")