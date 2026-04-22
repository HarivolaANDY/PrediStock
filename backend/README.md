## PrediStock — Backend (Django)

Ce dossier contient le backend Django de l'application PrediStock.

Ce README donne les instructions d'installation, configuration et d'exécution ainsi qu'un survol des composants principaux.

## Vue d'ensemble

- Framework : Django 6.0.x
- API : Django REST Framework (auth token)
- Base de données par défaut : SQLite (`db.sqlite3` dans la racine de `backend/`)
- Applications principales (apps) :
  - `apps.core`
  - `apps.accounts`
  - `apps.notifications`
  - `apps.catalogue`
  - `apps.commandes`
  - `apps.stock`
  - `apps.forecasting`

Le projet inclut aussi des dépendances pour le traitement asynchrone et ML (ex : `django-q`, `celery`, `torch`, `pandas`, `numpy`, etc.). Voir `requirements.txt` pour la liste complète.

## Endpoints API (routage)

Les routes principales exposées par le backend suivent le préfixe `/api/` défini dans [config/urls.py](config/urls.py#L1-L31). Les routes ci-dessous sont les chemins de base ; les `ViewSet` enregistrés via `DefaultRouter` exposent les opérations CRUD standards (`GET /`, `POST /`, `GET /{pk}/`, `PUT/PATCH /{pk}/`, `DELETE /{pk}/`).

- Administration Django : `/admin/`
- Comptes (auth, profils) : `/api/accounts/`
  - Routes du router : `/api/accounts/roles/` (ViewSet `RoleViewSet`)
  - Endpoints complémentaires :
    - `/api/accounts/login/`
    - `/api/accounts/logout/`
    - `/api/accounts/register/`
    - `/api/accounts/profile/`
    - `/api/accounts/update-user/`
    - `/api/accounts/check-availability/`
    - `/api/accounts/test-email/`
- Catalogue : `/api/catalogue/`
  - Router exposé : `/api/catalogue/categories/`, `/api/catalogue/suppliers/`, `/api/catalogue/products/`, `/api/catalogue/produits-dv/`
- Stock : `/api/stock/`
  - Router exposé : `/api/stock/historique-inventaire/`, `/api/stock/inventaire/`, `/api/stock/historique-seuil-stock/`, `/api/stock/mouvements/`
- Commandes : `/api/commandes/`
  - Router exposé : `/api/commandes/bon-commande/`, `/api/commandes/contenu-dans/`, `/api/commandes/donnee-vente/`, `/api/commandes/produit-dv/`, `/api/commandes/retours/`
- Forecasting : `/api/forecasting/`
  - Router exposé : `/api/forecasting/data-import/`, `/api/forecasting/execution-pipeline/`, `/api/forecasting/predictions/`, `/api/forecasting/recommandations/`
  - Endpoints custom :
    - `POST /api/forecasting/execution-pipeline/run-etl/` — exécution ETL (lance la pipeline complet)
    - `POST /api/forecasting/predict/` — point d'entrée prédiction (exécute ou planifie la commande `prevision`)
    - `POST /api/forecasting/chat/` — endpoint de recommandation/chat alimenté par Gemini IA
    - `GET /api/forecasting/modeles/` — liste des modèles ML disponibles et métriques
    - `GET /api/forecasting/modeles/performance/` — métriques agrégées de performance
- Notifications : `/api/notifications/`
  - Router exposé : `/api/notifications/activites/`, `/api/notifications/alertes/`, `/api/notifications/notifications/`
- Core : `/api/core/`
  - Router exposé : `/api/core/pdf-historique/`, `/api/core/pdf/`

Remarques :
- Les chemins de détail suivent le pattern standard des routers DRF, par ex. `GET /api/catalogue/products/` (liste) et `GET /api/catalogue/products/{pk}/` (détail).
- Certaines routes personnalisées (ex. `/predict/`, `/chat/`, `/execution-pipeline/run-etl/`) sont définies explicitement et ne suivent pas forcément le pattern router.
- Pour obtenir la liste complète et à jour des endpoints (dont routes possiblement protégées par permissions), vous pouvez exécuter l'application et visiter l'interface browsable de DRF ou interroger `manage.py show_urls` si un plugin est installé.

## Prérequis

- Python 3.10+ recommandé (vérifier la compatibilité avec vos bibliothèques ML si vous utilisez les fonctionnalités de forecasting).
- Virtualenv / venv ou un gestionnaire d'environnement équivalent.

## Installation rapide (développement)

1. Ouvrir un terminal à la racine `backend/` :

```powershell
cd d:\PFL\Prog\Python\PrediStock\PrediStock\backend
```

2. Créer et activer un environnement virtuel (ex. venv) :

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3. Mettre à jour pip et installer les dépendances :

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Remarque : `requirements.txt` contient de nombreuses bibliothèques ML (torch, torchvision, etc.). Sur certaines machines, l'installation peut nécessiter des roues binaires spécifiques ou CUDA. Adapter selon votre configuration.

## Configuration

- Le fichier principal des settings est `config/settings.py`.
- Par défaut :
  - `DEBUG = True`
  - `DATABASES` est configuré pour SQLite (fichier `db.sqlite3`)
  - `AUTH_USER_MODEL = 'accounts.User'`
  - `REST_FRAMEWORK` utilise l'authentification par token (`TokenAuthentication`) et une permission par défaut `IsAuthenticated`
  - `MEDIA_ROOT = BASE_DIR / 'media'` — fichiers générés (rapports PDF, uploads)
  - `MEDIA_URL = '/media/'` — URL d'accès publique aux fichiers médias

Variables d'environnement importantes (à définir en production) :

- `SECRET_KEY` — Remplacer la clé de développement dans `config/settings.py` (ou mieux : la charger depuis une variable d'environnement).
- `DEBUG` — `False` en production.
- `GOOGLE_API_KEY` — Clé API Google Generative AI (pour le chatbot Gemini dans `RecommenderView`).
- Paramètres DB (si vous remplacez SQLite par Postgres/MySQL) : `DATABASES` dans `config/settings.py`.

Un fichier `.env.example` est fourni ; copiez-le en `.env` et remplissez les valeurs réelles.

Note sur CORS : le projet inclut `corsheaders` et autorise par défaut toutes origines (`CORS_ALLOW_ALL_ORIGINS = True` dans les settings actuels). Restreindre en production via `CORS_ALLOWED_ORIGINS`.

Note sur les médias : les fichiers générés (rapports PDF de mouvements stock, exports de recommandations) sont stockés dans `media/rapports/`. Assurez-vous que ce répertoire est writable et qu'il est servi en production via un reverse proxy (Nginx, Apache) ou un service cloud (S3, etc.).

## Base de données & migrations

1. Appliquer les migrations :

```powershell
python manage.py migrate
```

2. Créer un superutilisateur (admin) :

```powershell
python manage.py createsuperuser
```

Le fichier `db.sqlite3` est présent dans le dépôt (s'il est commité) ; si vous souhaitez partir d'une base vide, supprimez-le et lancez `migrate`.

## Lancer le serveur (développement)

```powershell
python manage.py runserver 0.0.0.0:8000
```

L'API sera disponible sur `http://localhost:8000/` (ou sur l'hôte et port choisis).

Vérifiez que les migrations sont appliquées et la base est initialisée :

```powershell
python manage.py migrate
python manage.py createsuperuser  # créer un admin
python manage.py runserver
```

## Authentification API

- `rest_framework.authtoken` est installé. L'API utilise Token Authentication par défaut (vérifier `REST_FRAMEWORK` dans `config/settings.py`).
- Pour générer un token pour un utilisateur :

  - via l'admin Django (modèle `authtoken.Token`) ; ou
  - via un endpoint API `/api/accounts/login/` (POST avec username/password) ; ou
  - via un script Python :

```python
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.get(username='votre_user')
token, created = Token.objects.get_or_create(user=u)
print(token.key)
```

**Exemples d'appels API avec token :**

```bash
# Lister les produits
curl -H "Authorization: Token <votre_token>" \
  http://localhost:8000/api/catalogue/products/

# Récupérer les recommandations
curl -H "Authorization: Token <votre_token>" \
  http://localhost:8000/api/forecasting/recommandations/

# Créer une alerte
curl -X POST http://localhost:8000/api/notifications/alertes/ \
  -H "Authorization: Token <votre_token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Stock faible","description":"Produit X en rupture"}'
```

## Pipeline ML & Prédictions (Forecasting)

La nouvelle commande `python manage.py prevision` implémente un pipeline ML complet :

**Fonctionnalité :**
- Collecte l'historique de mouvements stock des 180 derniers jours (`MouvementStock`).
- Construit des features temporelles (jour de semaine, mois, lags 1/7/30, rolling means).
- Entraîne 4 modèles en parallèle : **XGBoost**, **LightGBM**, **Regréssion Linéaire**, **Ridge**.
- Évalue chaque modèle et sélectionne le meilleur par score RMSE normalisé.
- Génère des prédictions pour les N jours suivants (par défaut 30 jours).
- Sauvegarde les prédictions dans le modèle `Prediction`.
- Génère automatiquement des recommandations via heuristiques basées sur le stock actuel et les taux de sortie prédits.

**Utilisation :**

```powershell
# Lancer avec horizon par défaut (30 jours)
python manage.py prevision

# Lancer avec horizon personnalisé
python manage.py prevision --horizon 60
```

**Fallback heuristique :**
Si l'historique est insuffisant pour un produit, la commande utilise une heuristique basée sur les 90 derniers jours (taux de sortie moyen) plutôt que de sauter le produit.

**Résultats :**
- Modèles ML stockés dans la table `Modele` avec MAE, RMSE, MAPE, score.
- Prédictions stockées dans `Prediction` (export_qty, import_qty, stock_prevu, rupture flag).
- Recommandations stockées dans `Recommandation` (type=import/export, quantité, priorité, raisonnement).

**Appel via l'API :**

```bash
curl -X POST http://localhost:8000/api/forecasting/predict/ \
  -H "Authorization: Token <votre_token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Cetta appelera `call_command('prevision')` de manière synchrone et retournera un succès/erreur.

## Tâches asynchrones / files d'attente

- `django-q` figure dans `INSTALLED_APPS`. Vérifier la configuration si vous utilisez des tâches asynchrones.
- `celery` est présent dans `requirements.txt`, mais la configuration Celery n'est pas apparente dans `config/settings.py`. Si vous utilisez Celery, ajoutez la configuration (broker, backend) et les workers adaptés.
- Le pipeline ML `prevision` peut être intégré à Celery via `async_task` pour exécution backgroundée (actuellement exécution synchrone).

## Tests

Exécuter la suite de tests Django :

```powershell
python manage.py test
```

Selon les dépendances ML et les tests, cela peut prendre du temps. Pour exécuter les tests d'une application spécifique :

```powershell
python manage.py test apps.accounts
```

## Structure importante

- `manage.py` — utilitaire Django (point d'entrée).
- `config/` — configuration du projet (settings, urls, wsgi, asgi).
- `apps/` — dossiers applicatifs :
  - **accounts** : authentification, utilisateurs, tokens, rôles.
  - **catalogue** : produits, catégories, fournisseurs, produits dérivés (variants).
  - **stock** : inventaire, mouvements, seuils d'alerte, historiques.
  - **commandes** : bons de commande, contenus, données de vente, retours.
  - **forecasting** : prédictions ML, recommandations, modèles, IA chatbot, pipeline ETL.
  - **notifications** : activités, alertes, notifications utilisateur.
  - **core** : utilitaires PDF, vues génériques CRUD, réponses standardisées.
- `requirements.txt` — dépendances Python (ML, Web, async).
- `db.sqlite3` — base SQLite (à remplacer en production).
- `media/` — fichiers médias générés :
  - `media/rapports/` — rapports PDF (mouvements stock, entrées/sorties).
  - `media/uploads/` — uploads utilisateur (images, documents).
- `rapports/` — dossier archive pour les rapports PDF générés.

## Fichiers générés & rapports

**Rapports PDF :**
- Lieu : `backend/media/rapports/`
- Générés lors d'opérations de mouvement stock (entrées/sorties).
- Format : ReportLab (Python), fichier `_generer_pdf_mouvement` dans `apps/catalogue/views.py`.
- Retour API : JSON avec `url` et `filename` (lien accessible via `/media/rapports/<filename>`).

**Exemple :**
```json
{
  "url": "http://localhost:8000/media/rapports/Rapport_entrees_2026-04-14.pdf",
  "filename": "Rapport_entrees_2026-04-14.pdf",
  "message": "Opération enregistrée avec succès."
}
```

## Développement et bonnes pratiques

- Ne pas laisser `DEBUG = True` ni la `SECRET_KEY` en clair en production.
- Restreindre `CORS_ALLOWED_ORIGINS` en production.
- Utiliser un backend de base de données robuste (Postgres/MySQL) pour l'environnement de production.
- Si vous utilisez les fonctionnalités forecasting/ML :
  - Isoler dans un venv avec les dépendances ML exactes.
  - GPU/CUDA recommandé pour XGBoost/LightGBM si volumétrie importante.
  - Considérer un container Docker pour reproductibilité.
- Configurer les fichiers médias via un service cloud (S3, Azure Blob) ou un répertoire partagé en production.
- Tester le pipeline `prevision` en mode standalone : `python manage.py prevision --horizon 7` avant de l'intégrer à Celery/django-q.

## Dépannage rapide

- **Erreur d'import Django** : assurez-vous d'activer l'environnement virtuel et d'installer `requirements.txt`.
- **Problèmes d'authentification API** : vérifier l'existence d'un token pour l'utilisateur et le header `Authorization: Token <clé>`.
- **Erreur CORS** : si le frontend reçoit 403 CORS, vérifier `CORS_ALLOWED_ORIGINS` dans `settings.py` (en dev : `CORS_ALLOW_ALL_ORIGINS = True`).
- **Le pipeline `prevision` crash** : vérifier les logs; possibles causes :
  - Pas de `MouvementStock` pour un produit → fallback heuristique est appliqué.
  - Dépendances ML non installées → `pip install xgboost lightgbm scikit-learn`.
  - `GOOGLE_API_KEY` manquante pour le chatbot → vérifier `.env`.
- **Rapports PDF non générés** : vérifier que `media/rapports/` est writable et que `MEDIA_ROOT` est défini dans `settings.py`.
- **Erreur 404 sur `/media/...`** : en production, servir les médias via Nginx/Apache plutôt que Django (voir `config/urls.py` avec `static()`).

## Où regarder ensuite

- **Points d'entrée API** : `apps/*/views.py` et `apps/*/urls.py`.
  - Forecasting : `apps/forecasting/views.py` contient `RunPredictionView`, `RecommenderView`, `ModeleListView`.
  - Catalogue : `apps/catalogue/views.py` contient `ProduitDvViewSet` avec `_generer_pdf_mouvement`.
- **Sérializers** : `apps/*/serializers.py` (validation des données, formats de réponse).
- **Modèles** : `apps/*/models.py` (schéma DB, relations, validations).
- **Pipeline ML** : `apps/forecasting/management/commands/prevision.py` (commande complet).
- **Autres** :
  - `apps/forecasting/runner.py` — orchestration des étapes ML.
  - `apps/forecasting/model_mapping.py` — mapping modèles.
  - `apps/forecasting/schemas.py` — schémas de validation Pydantic.
  - `apps/core/utils.py` — fonctions utilitaires (PDF, réponses, etc.).

## Mise à jour depuis avril 2026

**Changements récents (v2026-04-03+) :**
- ✅ Nouveau pipeline ML `prevision.py` (XGBoost, LightGBM, Linear, Ridge).
- ✅ Endpoints `/forecasting/modeles/` et `/forecasting/modeles/performance/`.
- ✅ Sauvegarde des rapports PDF dans `media/rapports/` avec URL de téléchargement.
- ✅ Normalisation des sérializers (champs par défaut Supplier, product_details).
- ✅ Support `GOOGLE_API_KEY` pour Gemini IA chatbot.
- ✅ Configuration media (MEDIA_ROOT, MEDIA_URL) et serving statique.
- ✅ Frontend intégré avec client axios centralisé.
