# apps/forecasting/sql_model.py
from django.db import connection
from decimal import Decimal
from datetime import date, datetime
import os, json

# ─────────────────────────────────────────────
# SCHEMA (DDL simplifié mais complet)
# ─────────────────────────────────────────────
SCHEMA = """\
CREATE TABLE catalogue_product (
    id INT, name VARCHAR, category_id INT, supplier_id INT,
    price NUMERIC, current_stock INT, stock_threshold INT,
    is_active BOOLEAN
);

CREATE TABLE catalogue_category (
    id INT, name VARCHAR
);

CREATE TABLE catalogue_supplier (
    id INT, name VARCHAR, lead_time INT
);

CREATE TABLE commandes_donneevente (
    id INT, date_vente DATE, quantite_vendu INT, montant_total NUMERIC
);

CREATE TABLE commandes_produitdonneevente (
    id INT, donnee_vente_id INT, produit_id INT
);

CREATE TABLE forecasting_prediction (
    id INT, product_id INT, date_prediction DATE, stock_prevu INT, rupture BOOLEAN
);

CREATE TABLE forecasting_recommandation (
    id INT, product_id INT, type_recommandation VARCHAR,
    quantite_suggeree INT, priority VARCHAR, est_applique BOOLEAN
);
"""

# ─────────────────────────────────────────────
# FEW-SHOT (réduit → CPU friendly)
# ─────────────────────────────────────────────
FEW_SHOT = """\
-- question: Catégories avec le plus de produits sous seuil
SELECT c.name, COUNT(p.id) AS nb
FROM catalogue_category c
JOIN catalogue_product p ON p.category_id = c.id
WHERE p.current_stock < p.stock_threshold AND p.is_active = TRUE
GROUP BY c.name
ORDER BY nb DESC
LIMIT 10;

-- question: Produits jamais vendus
SELECT p.name
FROM catalogue_product p
WHERE p.id NOT IN (
    SELECT DISTINCT pdv.produit_id FROM commandes_produitdonneevente pdv
)
AND p.is_active = TRUE;

-- question: Fournisseur avec le plus long délai de livraison
SELECT s.name, s.lead_time
FROM catalogue_supplier s
WHERE s.lead_time IS NOT NULL
ORDER BY s.lead_time DESC
LIMIT 1;

-- question: Recommandations non appliquées en priorité haute
SELECT p.name, r.type_recommandation, r.quantite_suggeree, r.date_prediction
FROM forecasting_recommandation r
JOIN catalogue_product p ON p.id = r.product_id
WHERE r.est_applique = FALSE AND r.priority = 'HAUTE'
ORDER BY r.date_prediction ASC;

-- question: Produits très vendus mais avec peu de stock
SELECT p.name, SUM(dv.quantite_vendu) AS total_ventes, p.current_stock
FROM catalogue_product p
JOIN commandes_produitdonneevente pdv ON pdv.produit_id = p.id
JOIN commandes_donneevente dv ON dv.id = pdv.donnee_vente_id
GROUP BY p.name, p.current_stock
ORDER BY total_ventes DESC, p.current_stock ASC
LIMIT 10;

-- question: Top produits vendus
SELECT p.name, SUM(dv.quantite_vendu) AS total
FROM catalogue_product p
JOIN commandes_produitdonneevente pdv ON pdv.produit_id = p.id
JOIN commandes_donneevente dv ON dv.id = pdv.donnee_vente_id
GROUP BY p.name
ORDER BY total DESC
LIMIT 5;

-- question: Produits en rupture
SELECT p.name, fp.stock_prevu
FROM forecasting_prediction fp
JOIN catalogue_product p ON p.id = fp.product_id
WHERE fp.rupture = TRUE;

-- question: Produits sous seuil
SELECT name, current_stock, stock_threshold
FROM catalogue_product
WHERE current_stock < stock_threshold;
"""

_FORBIDDEN = {
    "DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "CREATE", "GRANT",
    "RENAME", "EXEC", "EXECUTE", "REPLACE", "MERGE", "COMMIT", "ROLLBACK", "UNION"
}

# ─────────────────────────────────────────────
# MODEL
# ─────────────────────────────────────────────
class PredistockSQLModel:

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.model = None
            cls._instance.tokenizer = None
            cls._instance._tried_load = False
        return cls._instance

    # ─────────────────────────────────────────
    # LOAD MODEL (CPU optimisé)
    # ─────────────────────────────────────────
    def _load_model(self):
        if self.model is not None:
            return
        self._tried_load = True

        try:
            from transformers import AutoTokenizer, AutoModelForCausalLM
            import torch

            print("[NSQL] Chargement nsql-350M (CPU)...")

            self.tokenizer = AutoTokenizer.from_pretrained("NumbersStation/nsql-350M")
            self.model = AutoModelForCausalLM.from_pretrained(
                "NumbersStation/nsql-350M",
                torch_dtype=torch.float32
            )

            self.model.eval()
            print("✅ Modèle prêt.")

        except Exception as e:
            print(f"[NSQL] Erreur chargement : {e}")
            self.model = None
            self.tokenizer = None

    # ─────────────────────────────────────────
    # GENERATE SQL
    # ─────────────────────────────────────────
    def predict_sql(self, question: str) -> str:
        self._load_model()

        if not self.model:
            raise RuntimeError("Modèle non disponible")

        import torch

        prompt = (
            f"{SCHEMA}\n"
            f"{FEW_SHOT}\n"
            f"-- question: {question}\n"
            "SELECT"
        )

        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=1024  # réduit pour CPU
        )

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=120,   # réduit
                do_sample=False,
                pad_token_id=self.tokenizer.eos_token_id
            )

        generated = self.tokenizer.decode(outputs[0], skip_special_tokens=True)

        # 1. on enlève le prompt si présent
        sql_part = generated.replace(prompt, "").strip()

        # 2. fallback propre si le modèle renvoie du texte mixte
        if "SELECT" in sql_part.upper():
            sql_start = sql_part.upper().find("SELECT")
            sql = sql_part[sql_start:]
        else:
            sql = sql_part

        # 3. sécurité finale
        sql = sql.strip()

        # 4. couper au premier ;
        if ";" in sql:
            sql = sql.split(";")[0] + ";"

        # 5. sécurité anti SELECT SELECT
        if sql.upper().count("SELECT") > 1 and sql.upper().startswith("SELECT"):
            # garde uniquement le premier SELECT logique
            sql = "SELECT " + sql.split("SELECT", 2)[1]
            
        if not sql.upper().startswith("SELECT"):
            sql = "SELECT " + sql

        return sql.strip()

    # ─────────────────────────────────────────
    # EXECUTE
    # ─────────────────────────────────────────
    def execute(self, question: str) -> dict:
        try:
            sql = self.predict_sql(question)
        except Exception as e:
            print(f"[NSQL ERROR] predict_sql failed: {e}")
            return {"success": False, "error": str(e), "sql": None}

        if not sql:
            return {"success": False, "error": "SQL vide généré", "sql": None}

        print(f"[NSQL] SQL = {sql}")

        if not sql or "SELECT" not in sql.upper():
            return {"success": False, "error": "SQL invalide", "sql": sql}

        # Protection anti-multi-requêtes et injection
        sql_upper = sql.upper().strip()

        if not sql_upper.startswith("SELECT"):
             return {"success": False, "error": "Seulement les requêtes SELECT sont autorisées", "sql": sql}

        if ";" in sql_upper and sql_upper.find(";") < len(sql_upper) - 1:
            return {"success": False, "error": "Multi-requêtes interdites", "sql": sql}

        if any(word in sql_upper for word in _FORBIDDEN):
            return {"success": False, "error": "Requête interdite (mot-clé banni)", "sql": sql}

        try:
            with connection.cursor() as cursor:
                cursor.execute(sql)
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchmany(20)

            return {
                "success": True,
                "sql": sql,
                "columns": columns,
                "rows": rows
            }

        except Exception as e:
            return {"success": False, "error": str(e), "sql": sql}

    # ─────────────────────────────────────────
    # UTILS
    # ─────────────────────────────────────────
    @staticmethod
    def _safe(value):
        if isinstance(value, (date, datetime)):
            return value.isoformat()
        if isinstance(value, Decimal):
            return float(value)
        return value

    def _log_failed(self, question, sql, error):
        try:
            path = os.path.join(os.path.dirname(__file__), "failed_queries.jsonl")
            with open(path, "a", encoding="utf-8") as f:
                f.write(json.dumps({
                    "question": question,
                    "sql": sql,
                    "error": error
                }, ensure_ascii=False) + "\n")
        except:
            pass
        
_sql_instance = None

def get_sql_model():
    global _sql_instance
    if _sql_instance is None:
        _sql_instance = PredistockSQLModel()
    return _sql_instance


sql_model = PredistockSQLModel()