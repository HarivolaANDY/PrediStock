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
    - `/api/forecasting/execution-pipeline/run-etl/` — exécution ETL
    - `/api/forecasting/predict/` — point d'entrée prédiction
    - `/api/forecasting/chat/` — endpoint de recommandation/chat
    - `/api/forecasting/modeles/` — liste des modèles disponibles
    - `/api/forecasting/modeles/performance/` — performances des modèles
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
  - `REST_FRAMEWORK` utilise l'authentification par token (`TokenAuthentication`) et une permission par défaut `IsAuthenticated`.

Variables d'environnement importantes (à définir en production) :

- `SECRET_KEY` — Remplacer la clé de développement dans `config/settings.py` (ou mieux : la charger depuis une variable d'environnement).
- `DEBUG` — `False` en production.
- Paramètres DB (si vous remplacez SQLite par Postgres/MySQL) : `DATABASES` dans `config/settings.py`.

Note sur CORS : le projet inclut `corsheaders` et autorise par défaut toutes origines (`CORS_ALLOW_ALL_ORIGINS = True` dans les settings actuels). Restreindre en production.

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

## Authentification API

- `rest_framework.authtoken` est installé. L'API utilise Token Authentication par défaut (vérifier `REST_FRAMEWORK` dans `config/settings.py`).
- Pour générer un token pour un utilisateur :

  - via l'admin Django (modèle `authtoken.Token`) ; ou
  - via un script Python :

```python
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.get(username='votre_user')
token, created = Token.objects.get_or_create(user=u)
print(token.key)
```

## Tâches asynchrones / files d'attente

- `django-q` figure dans `INSTALLED_APPS`. Vérifier la configuration si vous utilisez des tâches asynchrones.
- `celery` est présent dans `requirements.txt`, mais la configuration Celery n'est pas apparente dans `config/settings.py`. Si vous utilisez Celery, ajoutez la configuration (broker, backend) et les workers adaptés.

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
- `apps/` — dossiers applicatifs (accounts, core, catalogue, commandes, stock, forecasting, notifications).
- `requirements.txt` — dépendances Python.
- `db.sqlite3` — base SQLite (si présente).
- `media/` — fichiers médias (upload).

## Développement et bonnes pratiques

- Ne pas laisser `DEBUG = True` ni la `SECRET_KEY` en clair en production.
- Restreindre `CORS_ALLOWED_ORIGINS` en production.
- Utiliser un backend de base de données robuste (Postgres) pour l'environnement de production.
- Si vous utilisez les fonctionnalités forecasting/ML, privilégiez un environnement isolé avec les bonnes versions de CUDA si nécessaire.

## Dépannage rapide

- Erreur d'import Django : assurez-vous d'activer l'environnement virtuel et d'installer `requirements.txt`.
- Problèmes d'authentification API : vérifier l'existence d'un token pour l'utilisateur et le header `Authorization: Token <clé>`.

## Où regarder ensuite

- Points d'entrée API : `apps/*/views.py` et `apps/*/urls.py`.
- Sérializers : `apps/*/serializers.py`.
- Modèles : `apps/*/models.py`.
- Signaux / runner / mapping ML : `apps/forecasting/` contient `runner.py`, `model_mapping.py`, etc.

## Licence & contributions

Voir la racine du dépôt pour la licence (si fournie). Pour contribuer, créer une branche de fonctionnalité, ajouter des tests et soumettre une pull request.

---
