# apps/core/nlp_engine.py
import re
from datetime import date, timedelta


class NLPEngine:

    INTENTS = {
        "STOCK": [
            "stock", "quantité", "quantite", "reste", "disponible",
            "en stock", "niveau de stock", "niveau"
        ],
        "RUPTURE": [
            "rupture", "ruptures", "rupture de stock", "en rupture",
            "manque", "épuisé", "épuisés", "plus de stock",
            "stock critique", "alerte stock"
        ],
        "THRESHOLD": [
            "seuil", "seuils", "sous le seuil", "en dessous du seuil",
            "stock minimum", "stock min", "inférieur au seuil",
            "sous seuil", "alerte", "alertes", "en alerte",
            "stock bas", "bas stock", "stock faible",
        ],
        "COUNT": [
            "combien", "nombre total", "total de produits",
            "combien y a-t-il", "en tout",
        ],
        "PRODUCTS": [
            "produit", "produits", "liste", "catalogue", "inventaire",
            "liste des produits", "tous les produits", "afficher les produits",
            "quels sont les produits", "montrer les produits"
        ],
        "CATEGORY": [
            "catégorie", "categorie", "type", "famille", "gamme"
        ],
        "SUPPLIER": [
            "fournisseur", "fournisseurs", "qui fournit",
            "délai", "lead time", "approvisionnement", "infos sur le fournisseur",
            "informations fournisseur", "livraison"
        ],
        "PREDICTION": [
            "prédiction", "prediction", "prévision", "prevision",
            "prévoir", "prévu", "stock prévu", "à venir",
            "dans les prochains jours", "prochainement"
        ],
        "TOP_SALES": [
            "top ventes", "top produits", "meilleures ventes",
            "plus vendus", "les plus vendus", "best seller",
            "ventes", "chiffre", "revenus"
        ],
        "RECOMMANDATION": [
            "recommandation", "recommandations", "recommander",
            "conseil", "suggestions", "à importer", "à exporter"
        ],
    }

    EMPTY_MESSAGES = {
        "STOCK":         "Je n'ai trouvé aucun produit correspondant à votre recherche.",
        "RUPTURE":       "Bonne nouvelle ! Aucune rupture de stock n'est détectée en ce moment.",
        "THRESHOLD":     "Tous les produits sont au-dessus de leur seuil minimum. Tout va bien !",
        "COUNT":         "Aucun produit actif trouvé.",
        "PRODUCTS":      "Le catalogue est vide pour l'instant.",
        "CATEGORY":      "Aucune catégorie trouvée.",
        "SUPPLIER":      "Aucun fournisseur trouvé.",
        "PREDICTION":    "Pas de prédiction disponible pour le moment.",
        "TOP_SALES":     "Aucune donnée de vente disponible.",
        "RECOMMANDATION":"Aucune recommandation disponible.",
    }

    INTRO_MESSAGES = {
        "STOCK":         "Voici les niveaux de stock actuels :",
        "RUPTURE":       "Voici les produits actuellement en rupture de stock :",
        "THRESHOLD":     "Ces produits sont en dessous de leur seuil minimum :",
        "COUNT":         "Nombre de produits dans le catalogue :",
        "PRODUCTS":      "Voici tous les produits du catalogue :",
        "CATEGORY":      "Voici les catégories disponibles :",
        "SUPPLIER":      "Voici les informations fournisseurs :",
        "PREDICTION":    "Voici les prévisions de stock :",
        "TOP_SALES":     "Voici les produits les plus vendus :",
        "RECOMMANDATION":"Voici les recommandations en cours :",
    }

    COMPLEXITY_SIGNALS = [
        "le plus", "la plus", "les plus",
        "jamais", "jamais vendu",
        "par catégorie", "par fournisseur",
        "combien par", "moyenne", "total par",
        "non appliqué", "appliquées",
        "en priorité", "qui ont", "quels produits du",
        "valeur totale", "chiffre d'affaires",
    ]

    NON_SQL_PATTERNS = [
        r"^(ah|ok|oui|non|merci|bonjour|bonsoir|salut|super|bien|parfait)[\s!?.]*$",
        r"^(ah bon|d'accord|je vois|compris|entendu)[\s!?.]*$",
        r"^\?+$",
        r"^(pourquoi|comment|qu'est-ce|explique|aide|help)\b",
    ]

    @staticmethod
    def is_conversational(message: str) -> bool:
        msg = message.strip().lower()
        if len(msg) < 20:
            for pattern in NLPEngine.NON_SQL_PATTERNS:
                if re.match(pattern, msg, re.IGNORECASE):
                    return True
        return False

    @staticmethod
    def is_complex(message: str) -> bool:
        msg = message.lower().strip()
        return any(signal in msg for signal in NLPEngine.COMPLEXITY_SIGNALS)

    @staticmethod
    def detect_intent(message: str) -> str | None:
        msg = message.lower().strip()
        priority = [
            "COUNT", "RUPTURE", "THRESHOLD", "TOP_SALES", "RECOMMANDATION",
            "PREDICTION", "SUPPLIER", "CATEGORY", "STOCK", "PRODUCTS"
        ]
        for intent in priority:
            for p in NLPEngine.INTENTS[intent]:
                if p in msg:
                    return intent
        return None

    # ── Extraction produit (exact) ──────────────────────────────────
    @staticmethod
    def extract_product(message: str, products) -> str | None:
        msg = message.lower()
        for product in sorted(products, key=len, reverse=True):
            if product.lower() in msg:
                return product
        return None

    # ── Extraction produit avec tolérance fautes de frappe ──────────
    @staticmethod
    def extract_product_fuzzy(message: str, products) -> str | None:
        # 1. Exact d'abord
        exact = NLPEngine.extract_product(message, products)
        if exact:
            return exact

        # 2. Levenshtein sur chaque mot du message
        words = re.findall(r'\b\w{3,}\b', message.lower())
        best_match = None
        best_score = 999

        for word in words:
            for product in products:
                prod_lower = product.lower()
                dist = NLPEngine._levenshtein(word, prod_lower)
                threshold = max(1, len(prod_lower) // 5)
                if dist <= threshold and dist < best_score:
                    best_score = dist
                    best_match = product

        return best_match

    @staticmethod
    def _levenshtein(s1: str, s2: str) -> int:
        if len(s1) > len(s2):
            s1, s2 = s2, s1
        distances = range(len(s1) + 1)
        for i2, c2 in enumerate(s2):
            distances_ = [i2 + 1]
            for i1, c1 in enumerate(s1):
                if c1 == c2:
                    distances_.append(distances[i1])
                else:
                    distances_.append(1 + min(distances[i1], distances[i1 + 1], distances_[-1]))
            distances = distances_
        return distances[-1]

    # ── Extraction fournisseur ──────────────────────────────────────
    @staticmethod
    def extract_supplier_fuzzy(message: str, suppliers) -> str | None:
        msg = message.lower()

        # 1. Match exact
        for s in sorted(suppliers, key=len, reverse=True):
            if s.lower() in msg:
                return s

        # 2. Levenshtein sur chaque mot
        words = re.findall(r'\b\w{3,}\b', msg)
        best_match = None
        best_score = 999

        for word in words:
            for supplier in suppliers:
                sup_lower = supplier.lower()
                dist = NLPEngine._levenshtein(word, sup_lower)
                threshold = max(1, len(sup_lower) // 4)
                if dist <= threshold and dist < best_score:
                    best_score = dist
                    best_match = supplier

        return best_match

    # ── Extraction date relative ────────────────────────────────────
    @staticmethod
    def extract_relative_date(message: str) -> date | None:
        msg = message.lower()
        today = date.today()
        if "aujourd'hui" in msg or "aujourd hui" in msg:
            return today
        if "demain" in msg:
            return today + timedelta(days=1)
        if "cette semaine" in msg:
            return today + timedelta(days=7)
        if "ce mois" in msg or "ce mois-ci" in msg:
            return today + timedelta(days=30)
        m = re.search(r"dans\s+(\d+)\s+jours?", msg)
        if m:
            return today + timedelta(days=int(m.group(1)))
        return None

    # ── BUILD SQL ───────────────────────────────────────────────────
    @staticmethod
    def build_sql(intent: str, message: str) -> tuple[str, list] | None:
        from apps.catalogue.models import Product

        msg = message.lower()
        params = []

        if intent == "COUNT":
            return """
                SELECT COUNT(*) AS "Nombre total de produits actifs"
                FROM catalogue_product
                WHERE is_active = TRUE
            """, params

        if intent == "STOCK":
            products = Product.objects.values_list("name", flat=True)
            product = NLPEngine.extract_product_fuzzy(message, products)
            if product:
                params.append(f"%{product.lower()}%")
                return """
                    SELECT
                        p.name            AS "Produit",
                        p.current_stock   AS "Stock actuel",
                        p.stock_threshold AS "Seuil minimum",
                        CASE WHEN p.current_stock < p.stock_threshold
                             THEN 'Attention - sous le seuil'
                             ELSE 'OK'
                        END AS "Statut"
                    FROM catalogue_product p
                    WHERE LOWER(p.name) LIKE %s
                      AND p.is_active = TRUE
                """, params
            return """
                SELECT
                    p.name            AS "Produit",
                    p.current_stock   AS "Stock actuel",
                    p.stock_threshold AS "Seuil",
                    CASE WHEN p.current_stock < p.stock_threshold
                         THEN 'Sous le seuil'
                         ELSE 'OK'
                    END AS "Statut"
                FROM catalogue_product p
                WHERE p.is_active = TRUE
                ORDER BY p.current_stock ASC
            """, params

        if intent == "RUPTURE":
            return """
                SELECT p.name AS "Produit", p.current_stock AS "Stock actuel",
                    p.stock_threshold AS "Seuil minimum",
                    'Stock épuisé' AS "Statut"
                FROM catalogue_product p
                WHERE p.current_stock = 0 AND p.is_active = TRUE
                UNION
                SELECT p.name, fp.stock_prevu, p.stock_threshold,
                    'Rupture prévue'
                FROM forecasting_prediction fp
                JOIN catalogue_product p ON p.id = fp.product_id
                WHERE fp.rupture = TRUE
                ORDER BY 1 ASC
            """, params

        if intent == "THRESHOLD":
            return """
                SELECT
                    p.name            AS "Produit",
                    p.current_stock   AS "Stock actuel",
                    p.stock_threshold AS "Seuil minimum",
                    (p.stock_threshold - p.current_stock) AS "Écart"
                FROM catalogue_product p
                WHERE p.current_stock < p.stock_threshold
                  AND p.is_active = TRUE
                ORDER BY (p.stock_threshold - p.current_stock) DESC
            """, params

        if intent == "PRODUCTS":
            return """
                SELECT
                    p.name            AS "Produit",
                    c.name            AS "Catégorie",
                    p.current_stock   AS "Stock",
                    p.price           AS "Prix (€)"
                FROM catalogue_product p
                LEFT JOIN catalogue_category c ON c.id = p.category_id
                WHERE p.is_active = TRUE
                ORDER BY p.name ASC
            """, params

        if intent == "CATEGORY":
            products = Product.objects.values_list("name", flat=True)
            product = NLPEngine.extract_product_fuzzy(message, products)
            if product:
                params.append(f"%{product.lower()}%")
                return """
                    SELECT p.name AS "Produit", c.name AS "Catégorie"
                    FROM catalogue_product p
                    JOIN catalogue_category c ON c.id = p.category_id
                    WHERE LOWER(p.name) LIKE %s
                """, params
            return """
                SELECT
                    c.name               AS "Catégorie",
                    COUNT(p.id)          AS "Nombre de produits",
                    SUM(p.current_stock) AS "Stock total"
                FROM catalogue_category c
                LEFT JOIN catalogue_product p ON p.category_id = c.id AND p.is_active = TRUE
                GROUP BY c.name
                ORDER BY COUNT(p.id) DESC
            """, params

        if intent == "SUPPLIER":
            from apps.catalogue.models import Supplier
            supplier_names = list(Supplier.objects.values_list("name", flat=True))
            supplier = NLPEngine.extract_supplier_fuzzy(message, supplier_names)

            # Demande de délai spécifique
            if any(w in msg for w in ["délai", "livraison", "lead time"]):
                if supplier:
                    params.append(f"%{supplier.lower()}%")
                    return """
                        SELECT
                            s.name      AS "Fournisseur",
                            s.lead_time AS "Délai de livraison (jours)"
                        FROM catalogue_supplier s
                        WHERE LOWER(s.name) LIKE %s
                    """, params
                return """
                    SELECT s.name AS "Fournisseur", s.lead_time AS "Délai (jours)"
                    FROM catalogue_supplier s
                    WHERE s.lead_time IS NOT NULL
                    ORDER BY s.lead_time DESC
                """, params

            # Infos sur un fournisseur précis
            if supplier:
                params.append(f"%{supplier.lower()}%")
                return """
                    SELECT
                        s.name        AS "Fournisseur",
                        s.lead_time   AS "Délai (jours)",
                        COUNT(p.id)   AS "Produits fournis"
                    FROM catalogue_supplier s
                    LEFT JOIN catalogue_product p
                        ON p.supplier_id = s.id AND p.is_active = TRUE
                    WHERE LOWER(s.name) LIKE %s
                    GROUP BY s.name, s.lead_time
                """, params

            # Liste générale
            return """
                SELECT
                    s.name      AS "Fournisseur",
                    s.lead_time AS "Délai (jours)",
                    COUNT(p.id) AS "Produits fournis"
                FROM catalogue_supplier s
                LEFT JOIN catalogue_product p
                    ON p.supplier_id = s.id AND p.is_active = TRUE
                GROUP BY s.name, s.lead_time
                ORDER BY s.lead_time ASC NULLS LAST
            """, params

        if intent == "PREDICTION":
            target_date = NLPEngine.extract_relative_date(message)
            sql = """
                SELECT
                    p.name             AS "Produit",
                    fp.date_prediction AS "Date",
                    fp.stock_prevu     AS "Stock prévu",
                    CASE WHEN fp.rupture THEN 'Rupture prévue' ELSE 'OK' END AS "Statut"
                FROM forecasting_prediction fp
                JOIN catalogue_product p ON p.id = fp.product_id
                WHERE fp.date_prediction >= CURRENT_DATE
            """
            if target_date:
                sql += " AND fp.date_prediction <= %s"
                params.append(target_date.isoformat())

            sql += """
                ORDER BY fp.date_prediction ASC, fp.stock_prevu ASC
                LIMIT 30
            """
            return sql, params

        if intent == "TOP_SALES":
            return """
                SELECT
                    p.name                 AS "Produit",
                    SUM(dv.quantite_vendu) AS "Quantité vendue",
                    SUM(dv.montant_total)  AS "Chiffre d'affaires (€)"
                FROM catalogue_product p
                JOIN commandes_produitdonneevente pdv ON pdv.produit_id = p.id
                JOIN commandes_donneevente dv ON dv.id = pdv.donnee_vente_id
                GROUP BY p.name
                ORDER BY SUM(dv.quantite_vendu) DESC
                LIMIT 10
            """, params

        if intent == "RECOMMANDATION":
            return """
                SELECT
                    p.name                AS "Produit",
                    r.type_recommandation AS "Type",
                    r.quantite_suggeree   AS "Quantité suggérée",
                    r.priority            AS "Priorité",
                    r.date_prediction     AS "Date",
                    CASE WHEN r.est_applique THEN 'Appliquée' ELSE 'En attente' END AS "Statut"
                FROM forecasting_recommandation r
                JOIN catalogue_product p ON p.id = r.product_id
                ORDER BY
                    CASE r.priority WHEN 'HAUTE' THEN 1 WHEN 'MOYENNE' THEN 2 ELSE 3 END,
                    r.date_prediction ASC
            """, params

        return None

    # ── FORMAT RESPONSE ─────────────────────────────────────────────
    @staticmethod
    def format_response(intent: str, columns: list, rows: list) -> str:
        if not rows:
            return NLPEngine.EMPTY_MESSAGES.get(intent, "Aucun résultat trouvé.")

        intro = NLPEngine.INTRO_MESSAGES.get(intent, f"Résultats ({len(rows)}) :")
        lines = [f"{intro}\n"]

        for row in rows:
            parts = []
            for i, col in enumerate(columns):
                val = row[i]
                if val is None:
                    val = "—"
                elif isinstance(val, float):
                    val = f"{val:,.2f}"
                elif hasattr(val, "isoformat"):
                    val = val.strftime("%d/%m/%Y")
                parts.append(f"**{col}** : {val}")
            lines.append("• " + "  |  ".join(parts))

        if len(rows) >= 20:
            lines.append("\n_Affichage limité à 20 résultats._")

        return "\n".join(lines)

    @staticmethod
    def format_nsql_response(columns: list, rows: list, original_message: str) -> str:
        if not rows:
            return "Je n'ai trouvé aucun résultat pour votre question."

        msg = original_message.lower()

        if any(w in msg for w in ["rupture", "épuisé", "plus de stock"]):
            intro = f"Voici les produits en rupture de stock ({len(rows)}) :"
        elif any(w in msg for w in ["seuil", "critique", "alerte", "bas"]):
            intro = f"Ces produits sont sous leur seuil minimum ({len(rows)}) :"
        elif any(w in msg for w in ["catégorie", "categorie", "famille"]):
            intro = f"Voici la répartition par catégorie ({len(rows)}) :"
        elif any(w in msg for w in ["vente", "vendu", "top", "best"]):
            intro = f"Voici les produits les plus vendus ({len(rows)}) :"
        elif any(w in msg for w in ["fournisseur", "délai"]):
            intro = f"Voici les informations fournisseurs ({len(rows)}) :"
        else:
            intro = f"Voici les résultats ({len(rows)}) :"

        lines = [f"{intro}\n"]
        for row in rows:
            parts = []
            for i, col in enumerate(columns):
                val = row[i]
                if val is None:
                    val = "—"
                elif isinstance(val, float):
                    val = f"{val:,.2f}"
                elif hasattr(val, "isoformat"):
                    val = val.strftime("%d/%m/%Y")
                parts.append(f"**{col}** : {val}")
            lines.append("• " + "  |  ".join(parts))

        if len(rows) >= 20:
            lines.append("\n_Affichage limité à 20 résultats._")

        return "\n".join(lines)