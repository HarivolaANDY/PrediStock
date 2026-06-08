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

## 💡 Fonctionnalités Phares

- **Tableau de Bord Intelligent :** Visualisation en temps réel des indicateurs clés (KPIs).
- **Gestion Avancée des Stocks :** Historique complet, gestion des seuils critiques et alertes automatiques.
- **Chatbot IA :** Assistant conversationnel disponible sur toutes les pages pour interroger vos stocks en langage naturel.
- **Rapports Dynamiques :** Génération et export de rapports PDF/Excel directement depuis l'interface.
- **Mode Sombre/Clair :** S'adapte aux préférences de l'utilisateur.

---
*Développé pour PrediStock — Optimisez votre inventaire avec l'IA.*
