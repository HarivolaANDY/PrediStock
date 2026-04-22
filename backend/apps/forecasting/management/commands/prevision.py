# apps/forecasting/management/commands/prevision.py

from datetime import date, timedelta
import numpy as np
import pandas as pd

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Sum, Count

from sklearn.linear_model import LinearRegression, Ridge
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

from apps.catalogue.models import Product
from apps.stock.models import MouvementStock
from apps.forecasting.models import Prediction, Recommandation, Modele

# ── Modèles ML disponibles ────────────────────────────────────────────────────
MODELES_ML = {
    "XGBoost":             XGBRegressor(n_estimators=100, max_depth=3, learning_rate=0.1, verbosity=0),
    "RegressionLineaire":  LinearRegression(),
    "Ridge":               Ridge(alpha=1.0),
    "LightGBM":            LGBMRegressor(n_estimators=100, max_depth=3, learning_rate=0.1, verbose=-1),
}


def build_features(historique_df: pd.DataFrame, horizon: int) -> tuple:
    """
    Construit X (features) et y (target) depuis l'historique journalier.
    Features : jour_semaine, mois, lag_1, lag_7, lag_30, rolling_7, rolling_30
    """
    df = historique_df.copy()
    df = df.sort_values("date")
    df["lag_1"]      = df["qty"].shift(1)
    df["lag_7"]      = df["qty"].shift(7)
    df["lag_30"]     = df["qty"].shift(30)
    df["rolling_7"]  = df["qty"].rolling(7).mean()
    df["rolling_30"] = df["qty"].rolling(30).mean()
    df = df.dropna()

    feature_cols = ["jour_semaine", "mois", "lag_1", "lag_7", "lag_30", "rolling_7", "rolling_30"]
    X = df[feature_cols].values
    y = df["qty"].values
    return X, y, df, feature_cols


def predict_with_model(model, X_train, y_train, future_features):
    """Entraîne le modèle et prédit sur les features futures."""
    model.fit(X_train, y_train)
    preds = model.predict(future_features)
    return np.maximum(preds, 0)  # pas de valeurs négatives


def evaluer_modele(model, X, y) -> dict:
    """Calcule MAE, RMSE, MAPE sur les données d'entraînement (leave-last-out)."""
    if len(X) < 10:
        return {"mae": 0, "rmse": 0, "mape": 0, "score": 0}
    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    model.fit(X_train, y_train)
    y_pred = np.maximum(model.predict(X_test), 0)
    mae  = float(np.mean(np.abs(y_test - y_pred)))
    rmse = float(np.sqrt(np.mean((y_test - y_pred) ** 2)))
    mape = float(np.mean(np.abs((y_test - y_pred) / (y_test + 1e-9))) * 100)
    score = 1 / (1 + rmse)  # score normalisé entre 0 et 1
    return {"mae": mae, "rmse": rmse, "mape": mape, "score": score}


class Command(BaseCommand):
    help = "Génère des prédictions ML et des recommandations de réapprovisionnement."

    def add_arguments(self, parser):
        parser.add_argument('--horizon', type=int, default=30)

    def handle(self, *args, **options):
        horizon = options['horizon']
        today   = date.today()

        self.stdout.write(f"[Prévision ML] Démarrage — horizon={horizon}j")

        produits = Product.objects.filter(is_active=True)
        if not produits.exists():
            self.stdout.write(self.style.WARNING("Aucun produit actif."))
            return

        predictions_crees     = 0
        recommandations_crees = 0

        for produit in produits:
            try:
                # ── 1. Construire l'historique journalier ─────────────────
                date_debut = today - timedelta(days=180)

                mouvements = MouvementStock.objects.filter(
                    produit=produit,
                    timestamp__date__gte=date_debut,
                ).values("timestamp__date", "movement_type", "quantity")

                if not mouvements.exists():
                    self.stdout.write(f"  ⚠ Pas d'historique pour {produit.name}, fallback heuristique.")
                    self._heuristique(produit, today, horizon)
                    predictions_crees += horizon
                    continue

                # Agréger par jour
                records = {}
                for m in mouvements:
                    d = m["timestamp__date"]
                    if d not in records:
                        records[d] = {"entree": 0, "sortie": 0}
                    if m["movement_type"] == "IN":
                        records[d]["entree"] += m["quantity"]
                    else:
                        records[d]["sortie"] += m["quantity"]

                # Créer DataFrame complet (jours manquants = 0)
                date_range = pd.date_range(date_debut, today - timedelta(days=1))
                rows = []
                for d in date_range:
                    dd = d.date()
                    rows.append({
                        "date":         d,
                        "jour_semaine": d.dayofweek,
                        "mois":         d.month,
                        "qty_entree":   records.get(dd, {}).get("entree", 0),
                        "qty_sortie":   records.get(dd, {}).get("sortie", 0),
                        "qty":          records.get(dd, {}).get("sortie", 0),  # on prédit les sorties
                    })
                df = pd.DataFrame(rows)

                if len(df) < 15:
                    self.stdout.write(f"  ⚠ Historique insuffisant pour {produit.name}, fallback.")
                    self._heuristique(produit, today, horizon)
                    predictions_crees += horizon
                    continue

                # ── 2. Construire features ────────────────────────────────
                X, y, df_clean, feature_cols = build_features(df, horizon)

                if len(X) < 10:
                    self._heuristique(produit, today, horizon)
                    predictions_crees += horizon
                    continue

                # ── 3. Évaluer tous les modèles, choisir le meilleur ──────
                metriques = {}
                for nom, modele in MODELES_ML.items():
                    metriques[nom] = evaluer_modele(modele, X.copy(), y.copy())

                meilleur_nom = max(metriques, key=lambda n: metriques[n]["score"])
                meilleur_modele = MODELES_ML[meilleur_nom]

                self.stdout.write(f"  ✓ {produit.name} → meilleur modèle: {meilleur_nom} (score={metriques[meilleur_nom]['score']:.4f})")

                # ── 4. Sauvegarder les métriques dans Modele ─────────────
                for nom, m in metriques.items():
                    Modele.objects.update_or_create(
                        nom_modele=nom,
                        defaults={
                            "mae":   m["mae"],
                            "rmse":  m["rmse"],
                            "mape":  m["mape"],
                            "score": m["score"],
                            "periode_evaluation": horizon,
                        }
                    )

                # ── 5. Entraîner le meilleur modèle sur tout X ────────────
                meilleur_modele.fit(X, y)

                # ── 6. Construire les features futures ────────────────────
                last_row = df_clean.iloc[-1]
                future_features = []
                last_qty = float(last_row["qty"])

                for j in range(1, horizon + 1):
                    future_date = pd.Timestamp(today + timedelta(days=j))
                    future_features.append([
                        future_date.dayofweek,
                        future_date.month,
                        last_qty,           # lag_1 approx
                        float(df_clean["qty"].iloc[-7:].mean()) if len(df_clean) >= 7 else last_qty,
                        float(df_clean["qty"].iloc[-30:].mean()) if len(df_clean) >= 30 else last_qty,
                        float(df_clean["qty"].rolling(7).mean().iloc[-1]),
                        float(df_clean["qty"].rolling(30).mean().iloc[-1] if len(df_clean) >= 30 else df_clean["qty"].mean()),
                    ])

                future_arr   = np.array(future_features)
                export_preds = np.maximum(meilleur_modele.predict(future_arr), 0)

                # Prédire aussi les entrées avec RegressionLineaire
                df_entree     = df.copy()
                df_entree["qty"] = df_entree["qty_entree"]
                X_e, y_e, df_e, _ = build_features(df_entree, horizon)
                import_preds = np.zeros(horizon)
                if len(X_e) >= 10:
                    reg_import = LinearRegression()
                    reg_import.fit(X_e, y_e)
                    import_preds = np.maximum(reg_import.predict(future_arr[:len(X_e[0:1]) * 0 + horizon]), 0)

                # ── 7. Sauvegarder les prédictions ────────────────────────
                stock_actuel = float(produit.current_stock)
                for j in range(horizon):
                    date_pred    = today + timedelta(days=j + 1)
                    export_prevu = round(float(export_preds[j]), 2)
                    import_prevu = round(float(import_preds[j]), 2)
                    stock_prevu  = max(0.0, stock_actuel + import_prevu - export_prevu)
                    rupture      = stock_prevu <= 0

                    Prediction.objects.update_or_create(
                        product=produit,
                        date_prediction=date_pred,
                        defaults={
                            "import_qty":          import_prevu,
                            "import_lower_bound":  round(import_prevu * 0.8, 2),
                            "import_upper_bound":  round(import_prevu * 1.2, 2),
                            "export_qty":          export_prevu,
                            "export_lower_bound":  round(export_prevu * 0.8, 2),
                            "export_upper_bound":  round(export_prevu * 1.2, 2),
                            "stock_prevu":         round(stock_prevu, 2),
                            "rupture":             rupture,
                            "horizon":             j + 1,
                            "modele_utilise":      meilleur_nom,
                        }
                    )
                    predictions_crees += 1

                # ── 8. Recommandations ────────────────────────────────────
                taux_sortie_jour = float(df["qty_sortie"].mean())
                taux_entree_jour = float(df["qty_entree"].mean())
                seuil            = produit.stock_threshold or 0

                self._generer_recommandation(
                    produit, today, stock_actuel, seuil,
                    taux_sortie_jour, taux_entree_jour
                )
                recommandations_crees += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ✗ Erreur {produit.name}: {e}"))
                import traceback; traceback.print_exc()
                continue

        self.stdout.write(self.style.SUCCESS(
            f"[Prévision ML] Terminé — {predictions_crees} prédictions, "
            f"{recommandations_crees} recommandations sur {produits.count()} produits."
        ))

    # ── Fallback heuristique ──────────────────────────────────────────────────
    def _heuristique(self, produit, today, horizon):
        from django.db.models import Avg
        date_debut = today - timedelta(days=90)
        entrees = MouvementStock.objects.filter(
            produit=produit, movement_type='IN', timestamp__date__gte=date_debut
        ).aggregate(total=Sum('quantity'))
        sorties = MouvementStock.objects.filter(
            produit=produit, movement_type='OUT', timestamp__date__gte=date_debut
        ).aggregate(total=Sum('quantity'))

        taux_e = (entrees['total'] or 0) / 90
        taux_s = (sorties['total'] or 0) / 90
        stock  = float(produit.current_stock)

        for j in range(1, horizon + 1):
            date_pred    = today + timedelta(days=j)
            import_prevu = round(taux_e * j, 2)
            export_prevu = round(taux_s * j, 2)
            stock_prevu  = max(0.0, stock + import_prevu - export_prevu)

            Prediction.objects.update_or_create(
                product=produit,
                date_prediction=date_pred,
                defaults={
                    "import_qty":         import_prevu,
                    "import_lower_bound": round(import_prevu * 0.8, 2),
                    "import_upper_bound": round(import_prevu * 1.2, 2),
                    "export_qty":         export_prevu,
                    "export_lower_bound": round(export_prevu * 0.8, 2),
                    "export_upper_bound": round(export_prevu * 1.2, 2),
                    "stock_prevu":        round(stock_prevu, 2),
                    "rupture":            stock_prevu <= 0,
                    "horizon":            j,
                    "modele_utilise":     "heuristique",
                }
            )

    # ── Générateur de recommandations ─────────────────────────────────────────
    def _generer_recommandation(self, produit, today, stock_actuel, seuil,
                                 taux_sortie_jour, taux_entree_jour):
        if taux_sortie_jour > taux_entree_jour and taux_sortie_jour > 0:
            flux_net = taux_sortie_jour - taux_entree_jour
            jours_avant_rupture = int(stock_actuel / flux_net) if flux_net > 0 else 999
        else:
            jours_avant_rupture = 999

        if stock_actuel == 0:
            type_reco, priority = 'import', 'HAUTE'
            quantite     = max(seuil * 2, int(taux_sortie_jour * 30))
            raisonnement = "Rupture de stock actuelle. Commander immédiatement."
            date_reco    = today + timedelta(days=1)
        elif jours_avant_rupture <= 7:
            type_reco, priority = 'import', 'HAUTE'
            quantite     = max(seuil, int(taux_sortie_jour * 30))
            raisonnement = f"Rupture prévue dans {jours_avant_rupture}j. Flux sortant: {taux_sortie_jour:.1f}/j."
            date_reco    = today + timedelta(days=jours_avant_rupture)
        elif jours_avant_rupture <= 14:
            type_reco, priority = 'import', 'MOYENNE'
            quantite     = max(seuil, int(taux_sortie_jour * 14))
            raisonnement = f"Stock faible — rupture dans {jours_avant_rupture}j."
            date_reco    = today + timedelta(days=jours_avant_rupture - 3)
        elif stock_actuel <= seuil:
            type_reco, priority = 'import', 'BASSE'
            quantite     = seuil - int(stock_actuel) + int(taux_sortie_jour * 7)
            raisonnement = f"Stock ({stock_actuel}) sous le seuil ({seuil})."
            date_reco    = today + timedelta(days=14)
        else:
            jours_de_stock = stock_actuel / taux_sortie_jour if taux_sortie_jour > 0 else 999
            if jours_de_stock > 180:
                type_reco, priority = 'export', 'BASSE'
                quantite     = int(stock_actuel * 0.2)
                raisonnement = f"Surstock — {jours_de_stock:.0f}j de stock disponible."
                date_reco    = today + timedelta(days=30)
            else:
                return  # Stock OK

        Recommandation.objects.update_or_create(
            product=produit,
            date_prediction=date_reco,
            defaults={
                "type_recommandation": type_reco,
                "quantite_suggeree":   max(0, quantite),
                "prix_estime":         float(produit.price) * max(0, quantite) if produit.price else None,
                "priority":            priority,
                "raisonnement":        raisonnement,
                "est_applique":        False,
            }
        )