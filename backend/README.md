# PrediStock — Backend (Django)

Bienvenue dans le backend de **PrediStock**, une solution complète de gestion de stock et de prévision de la demande. Ce serveur est construit avec **Django 6.0** et **Django REST Framework (DRF)**.

## 🏗️ Architecture et Flux Logique

Le backend suit une architecture **modulaire basée sur les applications Django**, favorisant la séparation des préoccupations :

1.  **Couche API (DRF) :** Expose des endpoints RESTful consommés par le frontend React.
2.  **Couche Métier (Apps) :** Chaque application (`catalogue`, `stock`, `commandes`, etc.) gère sa propre logique et ses modèles de données.
3.  **Moteur de Prévision (Forecasting) :** Intègre des modèles de Machine Learning (XGBoost, LightGBM) pour prédire les besoins en stock.
4.  **Moteur NLP (Core) :** Gère la compréhension du langage naturel pour le chatbot, permettant de requêter la base de données en langage courant.
5.  **Couche de Persistance :** Utilise SQLite par défaut (facilement interchangeable avec PostgreSQL/MySQL).

### Flux de données type :
- Le frontend envoie une requête avec un Token d'authentification.
- Le backend valide le token via `TokenAuthentication`.
- La vue correspondante traite la demande (lecture/écriture en base, génération de PDF, ou calcul ML).
- Les données sont sérialisées en JSON et renvoyées au client.

## 📁 Structure du Projet

```
backend/
├── apps/                   # Applications métier du projet
│   ├── accounts/           # Utilisateurs, rôles, authentification
│   ├── catalogue/          # Produits, catégories, fournisseurs
│   ├── stock/              # État des stocks, mouvements (entrées/sorties)
│   ├── commandes/          # Bons de commande, ventes, retours
│   ├── forecasting/        # Pipeline ML, prédictions, recommandations
│   ├── notifications/      # Alertes et journal d'activités
│   └── core/               # Moteur NLP (Chatbot), utilitaires PDF
├── config/                 # Configuration globale (settings, routing)
├── media/                  # Fichiers médias (images produits, rapports PDF générés)
├── manage.py               # Point d'entrée des commandes Django
└── requirements.txt        # Dépendances Python
```

## 🛠️ Technologies Clés

- **Framework :** Django 6.0.3
- **API :** Django REST Framework 3.17
- **ML/IA :** XGBoost, LightGBM, Scikit-learn, LangChain (Gemini API)
- **Traitement d'images :** EasyOCR (pour le scan de documents)
- **Rapports :** ReportLab (génération de PDF)

## 📋 Prérequis

- **Python 3.10+**
- **pip** (gestionnaire de paquets Python)
- Un environnement virtuel (`venv`) est fortement recommandé.

## 🚀 Installation et Configuration

### 1. Préparation de l'environnement

```powershell
# Accéder au dossier backend
cd backend

# Créer l'environnement virtuel
python -m venv .venv

# Activer l'environnement (Windows)
.\.venv\Scripts\Activate.ps1
# Alternative (si restriction de script PowerShell) :
powershell -ExecutionPolicy Bypass -File .\.venv\Scripts\Activate.ps1
# Ou sur Linux/macOS :
source .venv/bin/activate
```

### 2. Installation des dépendances

```powershell
pip install -r requirements.txt
```

### 3. Configuration de la base de données

```powershell
# Appliquer les migrations
python manage.py migrate

# Créer un compte administrateur
python manage.py createsuperuser
```

### 4. Variables d'environnement

Créez un fichier `.env` à la racine de `backend/` en vous inspirant des réglages dans `config/settings.py` :
- `GOOGLE_API_KEY` : Nécessaire pour les fonctionnalités d'IA (Chatbot Gemini).

## 🏃 Exécution

```powershell
python manage.py runserver
```
Le serveur sera accessible sur `http://localhost:8000`.

## 🧠 Pipeline de Prévision (Machine Learning)

Le backend inclut une commande personnalisée pour entraîner les modèles et générer des prédictions :

```powershell
# Génère les prévisions pour les 30 prochains jours
python manage.py prevision --horizon 30
```

Cette commande :
1. Analyse l'historique des mouvements de stock.
2. Entraîne plusieurs modèles (XGBoost, LightGBM, Ridge, etc.).
3. Sélectionne le plus performant.
4. Enregistre les prévisions et génère des recommandations d'achat/vente.

## 📑 Documentation de l'API

Une fois le serveur lancé, vous pouvez explorer l'API via :
- L'interface d'administration : `http://localhost:8000/admin/`
- Les points d'entrée API documentés dans `config/urls.py`.

---
*Développé pour PrediStock — Solution intelligente de gestion de stock.*
