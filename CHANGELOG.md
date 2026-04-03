# CHANGELOG - Projet PrediStock

Ceci est le changelog global couvrant l'ensemble du dépôt (backend + frontend + assets) — extrait des modifications présentes en date du 2026-04-03.

## 2026-04-03 — Vue d'ensemble des modifications

Résumé : mise à jour fonctionnelle et nettoyage. Modifications notables touchent : configuration Django (`config/settings.py`), gestion médias (`MEDIA_ROOT`/`MEDIA_URL`), nouveaux endpoints forecasting, nouvelle commande ML `prevision`, génération de rapports PDF, normalisation des appels API côté frontend et création d'un client `axios` standard.

Liste synthétique des fichiers et changements importants :

- `backend/config/settings.py` — Ajout de `python-dotenv` (load_dotenv), `GOOGLE_API_KEY`, normalisation des headers CORS, ajout de `MEDIA_ROOT` et `MEDIA_URL`.
- `backend/config/urls.py` — Inclusion de `static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)` pour servir les médias.
- `backend/README.md` — Mise à jour : instructions et section `Endpoints API` détaillant les routes `/api/...`.
- `backend/.env.example` — Nouveau fichier d'exemple d'environnement (.env).
- `backend/requirements.txt` — Mise à jour/ajout des dépendances backend (ML + web).
- `backend/apps/forecasting/management/commands/prevision.py` — Nouvelle commande : pipeline ML (construction features, entraînement XGBoost/Linear/Ridge/LightGBM, prédictions, sauvegarde `Prediction` et génération `Recommandation` avec heuristiques de fallback).
- `backend/apps/forecasting/` — Ajouts/modifications : nouveaux champs sérializers (`product_name`), nouvelles vues `ModeleListView` et `ModelePerformanceView`, endpoints `modeles/` et `modeles/performance/`, exécution synchrone du pipeline via `call_command('prevision')` depuis l'API.
- `backend/apps/catalogue/` — Normalisations dans `serializers.py` (champs par défaut pour `Supplier`), sauvegarde PDF côté `views.py` dans `media/rapports/`, amélioration des méthodes et retours.
- `backend/apps/core/` — Nettoyage mineur et ajustements d'exports.
- `backend/rapports/Rapport_entrees_2026-03-31.pdf` — Nouveau rapport PDF généré.

- Frontend (normalisation des appels vers `/api/` et client axios) :
  - `frontend/src/services/axios.ts` — Création d'un client `API` avec `baseURL: 'http://localhost:8000/api/'` et interceptor d'`Authorization`.
  - `frontend/src/services/recommendationService.ts` — Réécriture robuste : `getAll`, `getPredictions`, `runPrediction`, `apply`, `chat`.
  - `frontend/src/services/chatbotService.ts` — Migration vers `api` (axios), adaptation du format de réponse.
  - `frontend/src/services/api.ts`, `alertService.ts` — Correction des endpoints (roles, notifications, alertes, etc.).
  - Plusieurs composants/pages : `Forecasting.tsx`, `AIModels.tsx`, `ProductManagerEntree.tsx`, `ProductManagerSortie.tsx`, `Stock.tsx`, `Products.tsx`, `Activitelist.tsx`, `Chatbot.tsx` — refactors pour utiliser `API` et nouveaux chemins (`/forecasting/*`, `/catalogue/*`, `/notifications/*`), meilleure gestion des erreurs, UI enrichie pour pipeline/prédictions/recommandations.

- Divers :
  - Ajout/compilation de bytecode Python dans `__pycache__` suite aux modifications (.pyc) — ces entrées sont générées automatiquement.
  - `requirements.txt` ajouté/actualisé à la racine du dépôt.
  
---

## Descriptions détaillées des 44 changements (backend + frontend)

1) `backend/README.md` — Mise à jour : section "Endpoints API"
  - Ajout d'une carte des routes exposées sous `/api/` (accounts, catalogue, stock, commandes, forecasting, notifications, core). Explique le pattern DRF router (CRUD) et les endpoints custom (`/predict/`, `/chat/`, `/execution-pipeline/run-etl/`). Impact : facilite le débogage et la navigation pour les devs; tester en exécutant le serveur et en parcourant `/api/`.

2) `backend/apps/catalogue/__pycache__/serializers.cpython-313.pyc` — Bytecode recompilé
  - Compilé automatiquement après modifications de `serializers.py`. Aucune action manuelle requise; ignorer dans le changelog principal si souhaité.

3) `backend/apps/catalogue/__pycache__/urls.cpython-313.pyc` — Bytecode recompilé
  - Idem; artefact de compilation Python.

4) `backend/apps/catalogue/__pycache__/views.cpython-313.pyc` — Bytecode recompilé
  - Artefact après edits dans `views.py`.

5) `backend/apps/catalogue/serializers.py` — SupplierSerializer : champs par défaut
  - Ajout de `name`, `email`, `phone`, `min_order_quantity`, `max_order_quantity`, `lead_time` avec valeurs par défaut et correction de `fields` string. But : éviter erreurs côté frontend si champs absents. Tester : POST/GET suppliers pour vérifier valeurs par défaut et sérialisation.

6) `backend/apps/catalogue/urls.py` — Router & commentaire
  - Confirmation des routes enregistrées (`categories`, `suppliers`, `products`, `produits-dv`) et commentaire ajouté. Impact faible, clarifie l'usage.

7) `backend/apps/catalogue/views.py` — Génération PDF et sauvegarde dans `media/rapports/`
  - `get_queryset` ajouté; `_generer_pdf_mouvement` modifié pour écrire le PDF dans `MEDIA_ROOT/rapports/`, construire URL absolue et retourner JSON avec `url` et `filename` au lieu d'un FileResponse direct. Avantage : frontend peut télécharger via lien; nécessite `MEDIA_ROOT`/`MEDIA_URL`. Tester : appel endpoint mouvement → vérifier fichier dans `media/rapports/` et URL dans réponse.

8) `backend/apps/core/__pycache__/views.cpython-313.pyc` — Bytecode recompilé
  - Artefact après modifs mineures.

9) `backend/apps/core/views.py` — Nettoyage mineur
  - Suppression d'une ligne vide superflue; pas de changement fonctionnel, améliore la lisibilité.

10) `backend/apps/forecasting/__pycache__/serializers.cpython-313.pyc` — Bytecode recompilé
  - Artefact.

11) `backend/apps/forecasting/__pycache__/urls.cpython-313.pyc` — Bytecode recompilé
  - Artefact.

12) `backend/apps/forecasting/__pycache__/views.cpython-313.pyc` — Bytecode recompilé
  - Artefact.

13) `backend/apps/forecasting/serializers.py` — Champs et serializers enrichis
  - `PredictionSerializer` expose désormais `product_name` (source), ajout de `ProductDetailsSerializer` et champ calculé `product_details` pour `RecommandationSerializer`. But : facilite rendu frontend en évitant joins supplémentaires. Tester : GET `/forecasting/predictions/` et `/forecasting/recommandations/` ; vérifier présence des nouveaux champs.

14) `backend/apps/forecasting/urls.py` — Nouveaux endpoints modèles
  - Ajout de `modeles/` et `modeles/performance/` (GET), et réorganisation des routes `predict`, `chat`, `execution-pipeline/run-etl`. Impact : expose métriques modèle et inventaire de modèles ML enregistrés; frontend utilise `/forecasting/modeles/`.

15) `backend/apps/forecasting/views.py` — RunPrediction et Recommender améliorés
  - `RunPredictionView.post` supporte planification (date + timezone) et exécution synchrone via `call_command('prevision')` si pas planifié. `RecommenderView` : prompts revus (extraction stricte JSON), renforcement des règles anti-prompt-injection, et addition des vues `ModeleListView`/`ModelePerformanceView` fournissant listes et métriques. Tester : POST sur `/forecasting/predict/` (vide → lance `prevision`), GET `/forecasting/modeles/`.

16) `backend/config/__pycache__/settings.cpython-313.pyc` — Bytecode recompilé
  - Artefact.

17) `backend/config/__pycache__/urls.cpython-313.pyc` — Bytecode recompilé
  - Artefact.

18) `backend/config/settings.py` — dotenv, clé Google, CORS et médias
  - `load_dotenv()` ajouté, `GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')`, `CORS_ALLOW_HEADERS` listée explicitement, `CORS_EXPOSE_HEADERS` ajoutée, et `MEDIA_ROOT`/`MEDIA_URL` définis. Impact : nécessite un `.env` en dev/prod et permet servir médias; tester en définissant `.env` et en vérifiant `settings.GOOGLE_API_KEY` et accès média.

19) `backend/config/urls.py` — Serve media en dev
  - Import de `settings` et `static(...)` puis append `+ static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)`. Permet l'accès aux fichiers générés (rapports) en environnement de développement.

20) `backend/requirements.txt` (backend) — Mise à jour dépendances
  - Fichier backend actualisé pour inclure bibliothèques ML/Web (torch, pandas, numpy, xgboost, lightgbm, django-q/celery selon besoin). Vérifier et pip install; tester l'environnement virtuel.

21) `frontend/src/components/Activitelist.tsx` — Correction endpoint
  - Changement `API.get('activite/')` → `API.get('/notifications/activites/')`. Raison : harmonisation route `/api/notifications/`. Test frontend : vérifier liste activités chargée.

22) `frontend/src/components/Chatbot.tsx` — Message d'accueil adapté
  - Remplace message générique par instruction guidée : exemple d'usage pour recommandations produit/date. But : aide l'utilisateur à formuler les requêtes compatibles avec `RecommenderView`.

23) `frontend/src/components/ProductManagerEntree.tsx` — Réorganisation en POST catalogue
  - Envoi du payload à `catalogue/produits-dv/entree/`, gestion de réponse simple contenant `url`/`filename`, génération d'un lien de téléchargement côté client, nettoyage state après succès et corrections de debounce. Tester : effectuer entrée produit → vérifier génération rapport et téléchargement.

24) `frontend/src/components/ProductManagerSortie.tsx` — Symétrie avec entrée
  - POST vers `catalogue/produits-dv/sortie/`, téléchargement via URL reçue, nettoyage des listes, gestion d'erreurs. Test similaire au point 23.

25) `frontend/src/components/suppliers/SupplierMetrics.tsx` — Robustification filtres
  - Ajout de `safeString` pour éviter crash si attributs null, correction des hooks `useMemo` dépendances, fallback affichage pour min/max order. Impact : UI plus résiliente face à données incomplètes.

26) `frontend/src/components/suppliers/SupplierStats.tsx` — Normalisation des données
  - Conversion `??` et cast booléen pour `isActive`, valeurs numériques par défaut (0) : évite NaN/undefined dans les tableaux et graphiques.

27) `frontend/src/pages/AIModels.tsx` — Passage à `api` (axios)
  - Requête vers `/forecasting/modeles/` et `/forecasting/modeles/performance/` via client axios `api`, gestion robuste des formats de réponse (`data`, `results`, `items`). Test : ouvrir page Modèles et vérifier affichage des modèles et métriques.

28) `frontend/src/pages/DataManagement.tsx` — Correction chemin data-import
  - Change fetch `.../data-import/` → `/api/forecasting/data-import/`, normalisation du parsing de la réponse (support `data` / `results`). Permet la découverte et lancement des sources ETL.

29) `frontend/src/pages/Forecasting.tsx` — Refactor UI + pipeline
  - Réécriture significative : gestion loading/error, boutons pour lancer pipeline (`/forecasting/predict/`), affichage recommendations/prévisions, actions pour `Appliquer` recommandation (POST apply), badges traduits. Intègre `recommendationService` pour appels. Tester : lancer pipeline, consulter recommandations et appliquer.

30) `frontend/src/pages/Notifications.tsx` — Correction endpoint notifications
  - `fetch('http://localhost:8000/notification/')` → `fetch('http://localhost:8000/api/notifications/')`. Corrige 404s et alimente UI notifications.

31) `frontend/src/pages/Products.tsx` — Vérifications d'endpoint revenus
  - Confirme appel `API.get('catalogue/revenues/mensuel/')` ; vérification des chemins côté backend recommandée (peut nécessiter `/api/catalogue/revenues/mensuel/`). Tester endpoint revenues.

32) `frontend/src/pages/Stock.tsx` — Logs debug et robustesse
  - Ajouts de console.logs pour inspecter `response.data`, correction du flow `isLoadingPDVs` (toggle correct), sécurisation des keys dans listes et fallback si données vides. Améliore le debugging lors d'intégration.

33) `frontend/src/services/alertService.ts` — Endpoint alertes
  - `fetch(.../alerte/)` → `fetch(.../notifications/alertes/)` pour coller au routeur backend; corrige erreurs fetch.

34) `frontend/src/services/api.ts` — RoleService endpoints
  - Correction des chemins pour la gestion des rôles (`/api/accounts/roles/`), et harmonisation GET/POST/PATCH endpoints. Améliore cohérence et supprime endpoints cassés.

35) `frontend/src/services/axios.ts` — Client `API` standardisé
  - Création d'un client axios avec `baseURL: 'http://localhost:8000/api/'`, timeout, et interceptor ajoutant `Authorization: Token <token>` si présent. Résultat : appels unifiés et gestion centralisée du token.

36) `frontend/src/services/chatbotService.ts` — Migration vers axios et format
  - Migration de fetch vers `api.post('/forecasting/chat/')`, définition d'une interface `ChatResponse`, meilleur parsing de payload et gestion d'erreurs harmonisée. Tester conversation chatbot.

37) `frontend/src/services/recommendationService.ts` — Réécriture service
  - Méthodes robustes : `getAll()` pour `/forecasting/recommandations/`, `getPredictions()` pour `/forecasting/predictions/`, `runPrediction()` (POST `/forecasting/predict/`), `chat()` et `apply()`. Extraction intelligente du tableau quel que soit `data/results`. Permet pages Forecasting/AIModels d'utiliser un contrat stable.

38) `frontend/tsconfig.app.json` — Option TypeScript
  - Ajout de `ignoreDeprecations: "6.0"` pour réduire le bruit de warnings lors de build/dev.

39) `backend/.env.example` — Nouveau fichier d'exemple
  - Contient `SECRET_KEY`, `DEBUG`, `GOOGLE_API_KEY` en clair d'exemple (à remplacer en prod). Important : ne pas committer clés réelles en clair.

40) `backend/CHANGELOG.md` — Changelog local backend
  - Ajout initial du changelog backend détaillant les modifications internes (fichier visible dans `backend/CHANGELOG.md`). Ce changement est complémentaire au changelog global placé à la racine.

41) `backend/apps/forecasting/management/commands/__pycache__/prevision.cpython-313.pyc` — Bytecode ajouté
  - Artefact de compilation pour la nouvelle commande `prevision`.

42) `backend/apps/forecasting/management/commands/prevision.py` — Nouvelle commande ML
  - Pipeline complet : collecte historique MouvementStock (dernier 180 jours), construction features (lags, rolling), entraînement/evaluation multi-modèles (XGBoost / LightGBM / Linear / Ridge), sélection du meilleur modèle, génération prédictions horizon N, sauvegarde `Prediction` et génération heuristique `Recommandation`. Comportements de fallback si peu de données. Tester via : `python manage.py prevision --horizon 30`.

43) `backend/rapports/Rapport_entrees_2026-03-31.pdf` — Rapport généré
  - PDF produit par la génération de rapports (ReportLab). Inclus dans `backend/rapports/` pour archiver le résultat d'opérations d'entrée. Ne pas versionner de gros binaires si non souhaité.

44) `requirements.txt` (racine) — Nouveau/updated
  - Un fichier `requirements.txt` a été ajouté à la racine du dépôt (duplicate possible du backend/requirements.txt) — nécessite harmonisation (préférer un seul fichier ou un `requirements/backend.txt` + `requirements/worker.txt`).
