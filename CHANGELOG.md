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

---

## 2026-04-14 — Améliorations Documentation Backend & ML Training

Résumé : enrichissement massif de la documentation backend et ajout du système de training T5 pour SQL NLQ-to-SQL.

### Changements au `backend/README.md`

Le README a été significativement enrichi depuis la snapshot 2026-04-03. Les sections suivantes ont été ajoutées ou largement développées :

45) `backend/README.md` — Section "Prérequis"
  - Ajout des exigences Python (3.10+), mention des dépendances ML et compatibilité CUDA. But : clarifier les prérequis matériels/logiciels avant installation.

46) `backend/README.md` — Section "Installation rapide (développement)"
  - Instructions détaillées pour création venv, activation sous Windows PowerShell, pip upgrade, installation `requirements.txt`. Inclut avertissement sur dépendances ML volumineuses. Tester : suivre les étapes et vérifier activation du venv.

47) `backend/README.md` — Section "Configuration"
  - Variables d'environnement clés : `SECRET_KEY` (production), `DEBUG`, `GOOGLE_API_KEY`, DB parameters. Explique `.env.example` (créer `.env` avec valeurs réelles). Détails CORS (restreindre en prod), médias (`MEDIA_ROOT`, `MEDIA_URL`, serveur cloud en prod). Impact : facilite setup production-ready.

48) `backend/README.md` — Section "Base de données & migrations"
  - Instructions `migrate`, `createsuperuser`, optionnalité de `db.sqlite3` (supprimer et recréer si fresh start). Tester : lancer migrations et créer admin.

49) `backend/README.md` — Section "Lancer le serveur (développement)"
  - Commande `runserver 0.0.0.0:8000`, vérifications pré-lancement (migrations, admin). Test simple : `python manage.py runserver` puis accès à `http://localhost:8000/`.

50) `backend/README.md` — Section "Authentification API" complète
  - Explication Token Authentication (`rest_framework.authtoken`). Trois méthodes génération token : Django admin, endpoint `/api/accounts/login/`, script Python direct. Exemples curl complets : listing produits, recommandations, création alerte. Impact : devs peuvent tester l'API immédiatement.

51) `backend/README.md` — Section "Pipeline ML & Prédictions (Forecasting)" enrichie
  - Détail complet de la commande `prevision` : collecte 180j, features (lags, rolling), 4 modèles (XGBoost/LightGBM/Linear/Ridge), sélection best model, horizon configurable (défaut 30j), heuristique fallback, stockage des résultats (`Prediction`, `Recommandation`). Explique appel API POST `/api/forecasting/predict/`. Tester : `python manage.py prevision --horizon 60`.

52) `backend/README.md` — Section "Tâches asynchrones / files d'attente"
  - Documentation `django-q`, `celery` (présents mais configuration absent). Suggestion d'intégration `prevision` via tasks backgroundées. Tester : configurer Celery et relancer pipeline asynchrone.

53) `backend/README.md` — Section "Tests"
  - Commandes `manage.py test` global ou par app (`apps.accounts`). Note : tests ML peuvent prendre temps. Tester : lancer suite et vérifier couverture.

54) `backend/README.md` — Section "Structure importante" détaillée
  - Description de chaque app : accounts (auth, tokens, rôles), catalogue (produits, catégories, fournisseurs), stock (inventaire, mouvements, seuils, historiques), commandes (bons, contenus, données vente, retours), forecasting (prédictions, recommandations, modèles, IA, ETL), notifications (activités, alertes, notifications), core (PDF, CRUD, réponses). Fichiers structures clés (`manage.py`, `config/`, `apps/`, `media/`). Tester : explorer chaque app et vérifier structure matches description.

55) `backend/README.md` — Section "Fichiers générés & rapports"
  - Explique stockage PDF (`media/rapports/`), génération ReportLab, retour JSON API (url + filename). Exemple JSON avec lien `/media/rapports/<filename>`. Tester : générer rapport mouvement et vérifier structure réponse.

56) `backend/README.md` — Section "Développement et bonnes pratiques"
  - Conseils sécurité (DEBUG=False, SECRET_KEY en env, CORS restrictif prod). Recommandations architecture (venv isolé, GPU/CUDA pour ML, Docker reproductibilité, S3/cloud médias prod). Note testing `prevision` standalone avant Celery. Tester : relire avant déploiement prod.

57) `backend/README.md` — Section "Dépannage rapide"
  - Problèmes courants : imports Django (activer venv), auth API (token présent), CORS (checkORIGINS), pipeline crash (`MouvementStock`, ML dépendances). Solutions incluses. Tester : consulter en cas d'erreur.

58) `backend/README.md` — Endpoints API : section "Remarques"
  - Explique pattern détail routes (DRF routers), routes personnalisées (`/predict/`, `/chat/`), possibilité checker endpoints via `show_urls`. Impact : clarté sur architecture routing.

### Changements ML Training System

59) `backend/apps/forecasting/training/dataset.json` — Nouveau dataset T5-NLQ
  - 762 exemples question-SQL français : requêtes stock (ruptures, mouvements, seuils), ventes (top sellers, non-vendus, taux rotation), prédictions (ruptures prévues, imports/exports recommandés), alertes (non lues, urgentes), commandes (fournisseurs, retards). Couvre tous les use-cases inventaire/prévisions. Tester : consulter file et vérifier couverture questions.

60) `backend/apps/forecasting/training/train.py` — Nouveau script training T5
  - Entraîne modèle T5-small pour NLQ → SQL generation. Charge dataset, tokénise inputs/targets, split train/test (90/10), entraîne 20 epochs, batch size 4. Sauvegarde modèle et tokenizer. Tester : `python train.py` (attention : temps long + GPU recommandé, ~10-20 min CPU).

61) `backend/apps/forecasting/training/generate_dataset.py` — Script génération dataset
  - Génère 762 exemples via templates + produits cibles (Air Fryer, Banane, Riz, Acoustic Guitar, Almond Butter, Air Mattress). Produit `dataset.json`. Tester : `python generate_dataset.py` et vérifier output JSON.

62) `backend/apps/forecasting/sql_model_weights/` — Dossier poids modèle T5
  - Racine contient config/tokenizer/modèle final (config.json, generation_config.json, model.safetensors, tokenizer.json).

63) `backend/apps/forecasting/sql_model_weights/config.json` — Config T5 model
  - Architecture T5ForConditionalGeneration : 6 layers encoder/decoder, 512 d_model, 8 heads, task-specific params (summarization, translation EN-DE/FR/RO). Impact : définit capacité du modèle pour SQL generation.

64) `backend/apps/forecasting/sql_model_weights/generation_config.json` — Generation params
  - Tokens spéciaux (pad, eos, decoder_start). Utilisé lors inférence pour contrôler output generation.

65) `backend/apps/forecasting/sql_model_weights/model.safetensors` — Poids modèle (236 MB)
  - Modèle T5 entraîné sauvegardé en format safetensors. Téléchargeable mais volumineux. Tester : charger via Hugging Face transformers et vérifier génération SQL.

66) `backend/apps/forecasting/sql_model_weights/tokenizer.json` — Tokenizer T5 (2.3 MB)
  - Vocabulaire T5 et config tokenization. Utilisé pour encoder questions NLQ avant passage au modèle.

67) `backend/apps/forecasting/sql_model_weights/tokenizer_config.json` — Config tokenizer
  - 32K vocab, T5Tokenizer class, special tokens (extra_ids 0-99), max_length 512. Format tokens JSON BPE.

68) `backend/apps/forecasting/sql_model_weights/checkpoint-86/` — Checkpoint early training
  - Sauvegarde epoch 2 (43 steps) : config, generation_config, model, optimizer, scheduler, rng_state, training metadata. Pour debug/resume si besoin.

69) `backend/apps/forecasting/sql_model_weights/checkpoint-860/` — Final checkpoint
  - Sauvegarde epoch 20 (860 steps, FINAL) : même structure que checkpoint-86 mais poids finaux, eval_loss=0.351 (meilleur modèle trouvé). Utilisé pour inférence production.

70) `backend/apps/forecasting/training/logs/` — Logs training
  - Logs tensorboard/training pendant entraînement (optionnel si loggings configurés).

### Impact & Recommandations

**Documentation** : Le README est maintenant une ressource auto-suffisante pour developers. Setup dev/prod, troubleshooting, API examples, ML pipeline — tout couvert.

**ML Training** : T5 model capable NLQ → SQL generation pour requêtes inventaire français. Checkpoint-860 (final) à utiliser en prod. Temps training : ~15-20 min CPU (⚡ recommandé GPU : NVIDIA CUDA 11.8+).

**Testing** :
- Doc : Suivre README sections dans l'ordre pour setup complet.
- ML : Charger modelT5 et tester sur questions du dataset.json.
- Integration : POST `/api/forecasting/predict/` doit utiliser modèle final (checkpoint-860).
