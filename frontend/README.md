# PrediStock — Frontend (React)

Bienvenue dans l'interface utilisateur de **PrediStock**, une application moderne de gestion de stock et de prévision, conçue pour offrir une expérience fluide et intelligente.

## 🏗️ Architecture et Design

Le frontend est une **Single Page Application (SPA)** performante, construite avec les standards modernes du web :

1.  **Interface Composants (React) :** Utilisation de **React 19** pour une interface réactive et modulaire.
2.  **Système de Design :** Basé sur **Tailwind CSS** et **Shadcn UI** pour une esthétique professionnelle, cohérente et supportant nativement les modes clair/sombre.
3.  **Gestion du State :**
    *   **Serveur :** **TanStack Query (React Query)** pour la synchronisation des données avec l'API, le cache et la gestion des états de chargement.
    *   **Local :** React Context API pour l'authentification (`AuthContext`) et l'interface (`SidebarContext`).
4.  **Communication API :** Client **Axios** centralisé avec intercepteurs pour la gestion automatique des tokens JWT/Token.

## 📁 Structure du Projet

```
frontend/
├── src/
│   ├── components/         # Composants UI réutilisables (shadcn + personnalisés)
│   ├── contexts/           # Fournisseurs d'état global (Auth, Theme, etc.)
│   ├── hooks/              # Hooks React personnalisés (useSettings, useToast, etc.)
│   ├── pages/              # Vues principales de l'application (Dashboard, Stock, etc.)
│   ├── services/           # Logique de communication avec l'API backend
│   ├── test/               # Configuration et outils partagés des tests (Vitest)
│   ├── types/              # Définitions TypeScript
│   ├── utils/              # Fonctions utilitaires et helpers
│   ├── App.tsx             # Configuration des routes (React Router)
│   └── main.tsx            # Point d'entrée de l'application
├── public/                 # Assets statiques
├── locales/                # Fichiers de traduction (i18next) pour le multi-langue
└── package.json            # Scripts et dépendances
```

## 🛠️ Technologies Clés

- **Framework :** React 19 + Vite
- **Langage :** TypeScript (pour une sécurité de typage accrue)
- **Stylisation :** Tailwind CSS, Shadcn UI, Lucide React (icônes)
- **Graphiques :** Recharts (visualisation des stocks et prévisions)
- **Formulaires :** React Hook Form + Zod (validation de schéma)
- **Internationalisation :** i18next

## 📋 Prérequis

- **Node.js 18+** (v20 recommandé)
- **npm** ou **yarn**

## 🚀 Installation et Configuration

### 1. Installation des dépendances

```bash
cd frontend
npm install
```

### 2. Configuration de l'API

Créez un fichier `.env` à la racine de `frontend/` :

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### 3. Lancement du serveur de développement

```bash
npm run dev
```
L'application sera accessible sur `http://localhost:5173`.

## 🏃 Scripts Disponibles

- `npm run dev` : Lance le serveur de développement avec rechargement à chaud.
- `npm run build` : Compile l'application pour la production (dossier `dist/`).
- `npm run lint` : Vérifie la qualité du code avec ESLint.
- `npm run preview` : Prévisualise la version de production localement.
- `npm test` : Exécute toute la suite de tests (une seule passe, adaptée à la CI).
- `npm run test:watch` : Relance les tests concernés à chaque modification.
- `npm run test:coverage` : Exécute les tests avec rapport de couverture (texte + HTML dans `coverage/`).

## 🧪 Tests

Les tests utilisent **Vitest** (environnement jsdom) et **Testing Library**. Ils ne contactent jamais le serveur : la couche service est simulée (`vi.mock`) et le graphique Recharts est remplacé par un double qui expose ses données.

```powershell
npm test                                   # toute la suite
npx vitest run src/pages/achat-vente       # un dossier
npx vitest run src/pages/achat-vente/__tests__/AchatPage.test.tsx   # un fichier
npx vitest run -t "livraison"              # les tests dont le nom contient « livraison »
```

Organisation (module **Achats & Ventes**, un fichier par mission du mémoire) :

| Fichier | Couvre |
|---|---|
| `src/pages/achat-vente/__tests__/AchatPage.test.tsx` | Mission 1 — achats : liste, filtres, statuts, formulaire multi-lignes, suppression, paiement en plusieurs versements, lots, historique des paiements |
| `.../VentePage.test.tsx` | Mission 2 — ventes : vente à crédit, contrôle de stock, créances, états de paiement, paiement en plusieurs versements |
| `.../RetoursPage.test.tsx` | Mission 3 — remboursements : montants à rembourser / à encaisser, règlement, détail |
| `.../AnalysePage.test.tsx` | Mission 4 — analyse financière : agrégation, jour/mois, marge, filtres |
| `.../MouvementsPage.test.tsx` | Mission 4 — historique : fusion mouvements + remboursements, annulations, lot de chaque mouvement |
| `.../moduleAchatsVentes.integration.test.tsx` | Les 5 écrans ensemble, navigation et synchronisation, face à un faux backend en mémoire |
| `src/services/__tests__/achatVenteService.test.ts` | Appels HTTP du module (URL, en-têtes, erreurs, enveloppe `data`, `payer`) |
| `src/components/achat-vente/__tests__/PaiementDialog.test.tsx` | Saisie d'un versement : montant ≤ reste à payer, pré-remplissage, « Solder », mode et note |
| `src/components/__tests__/MouvementBadge.test.tsx` | Badge du type de mouvement : annulation (inverse) et mouvement annulé |
| `src/utils/__tests__/mouvements.test.ts` | Mouvements annulés / inverses exclus des flux, nature achat/vente, statistiques par produit |

Aide commune : `src/test/` (`setup.ts`, `fixtures.ts`, `helpers.ts`, `renderWithProviders.tsx`).


## 💡 Fonctionnalités Phares

- **Tableau de Bord Intelligent :** Visualisation en temps réel des indicateurs clés (KPIs).
- **Gestion Avancée des Stocks :** Historique complet, gestion des seuils critiques et alertes automatiques.
- **Chatbot IA :** Assistant conversationnel disponible sur toutes les pages pour interroger vos stocks en langage naturel.
- **Rapports Dynamiques :** Génération et export de rapports PDF/Excel directement depuis l'interface.
- **Mode Sombre/Clair :** S'adapte aux préférences de l'utilisateur.

---
*Développé pour PrediStock — Optimisez votre inventaire avec l'IA.*
