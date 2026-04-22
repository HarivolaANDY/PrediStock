# PrediStock Frontend

A modern, feature-rich stock management and forecasting application built with React, TypeScript, and Tailwind CSS. PrediStock provides comprehensive inventory tracking, demand forecasting, supplier management, and AI-powered analytics to help businesses optimize their stock operations.

## 🚀 Features

- **Dashboard & Analytics** - Real-time metrics, charts, and activity reports
- **Stock Management** - Complete inventory control with movement tracking (entries/exits)
- **Demand Forecasting** - AI-powered forecasting models for inventory planning
- **Supplier Management** - Full supplier directory with detailed information
- **Product Management** - Comprehensive product catalog with images and categories
- **User & Role Management** - Multi-user support with role-based access control
- **Reports & Exports** - Generate and export reports in various formats (PDF, Excel)
- **Alerts & Notifications** - Configurable alerts for stock levels and important events
- **Chatbot Integration** - AI assistant for natural language queries
- **Multi-language Support** - Internationalization (i18n) ready
- **Dark/Light Theme** - Toggle between light and dark modes

## 🛠️ Technology Stack

| Technology | Version | Description |
|------------|---------|-------------|
| **React** | 18.3.1 | UI library |
| **TypeScript** | 5.5.3 | Type-safe JavaScript |
| **Vite** | 5.4.1 | Build tool and dev server |
| **Tailwind CSS** | 3.4.11 | Utility-first CSS framework |
| **React Router** | 6.26.2 | Client-side routing |
| **TanStack Query** | 5.56.2 | Data fetching and caching |
| **Axios** | 1.12.2 | HTTP client |
| **React Hook Form** | 7.53.0 | Form management |
| **Zod** | 3.23.8 | Schema validation |
| **shadcn/ui** | Latest | High-quality UI components (Radix UI) |
| **Recharts** | 2.12.7 | Chart library |
| **React i18next** | 15.7.3 | Internationalization |
| **React PDF** | 10.1.0 | PDF generation |

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets served as-is
├── locales/                # Internationalization (i18n) translation files
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/             # shadcn/ui base components
│   │   ├── charts/         # Chart-specific components
│   │   ├── stocks/         # Stock-related components
│   │   └── suppliers/      # Supplier-related components
│   ├── pages/              # Page components (routes)
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API service layer
│   ├── contexts/           # React Context providers
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── lib/                # Library utilities (e.g., cn helper)
│   ├── config/             # Configuration files
│   ├── image/              # Static images
│   ├── App.tsx             # Main application component
│   └── main.tsx            # Application entry point
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── eslint.config.js        # ESLint configuration
└── package.json            # Dependencies and scripts
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/components/` | Reusable UI components, including shadcn/ui primitives |
| `src/pages/` | Page-level components mapped to routes |
| `src/hooks/` | Custom hooks for shared logic (e.g., toast notifications) |
| `src/services/` | API integration and business logic services |
| `src/contexts/` | Global state management via React Context |
| `src/types/` | TypeScript interfaces and type definitions |
| `src/utils/` | Helper utilities (i18n, blob handling, etc.) |
| `locales/` | Translation files for multi-language support |

## �️ Routes & Pages

The application includes the following routes and pages:

### Public Routes (No Authentication Required)

| Route | Page Component | Description |
|-------|---|---|
| `/` | `Index.tsx` | Landing/Home page - Welcome screen for unauthenticated users |
| `/login` | `Login.tsx` | User login page |
| `/register` | `Register.tsx` | User registration page |

### Application Routes (Authentication Required)

#### Dashboard & Analytics
| Route | Page Component | Description |
|-------|---|---|
| `/dashboard` | `Dashboard.tsx` | User dashboard - Overview with metrics, charts, and activity |
| `/dashboard-admin` | `DashboardAdmin.tsx` | Admin-only dashboard with advanced metrics and management options |
| `/activite` | `Activite.tsx` | Activity log and tracking page |

#### Stock Management
| Route | Page Component | Description |
|-------|---|---|
| `/stock` | `Stock.tsx` | Stock management interface - View and manage inventory movements |
| `/product-manager` | `ProductManagerPage.tsx` | Product manager interface for handling stock entries/exits |

#### Products & Catalog
| Route | Page Component | Description |
|-------|---|---|
| `/products` | `Products.tsx` | Product catalog - Browse all available products |
| `/product/:id` | `ProductDetails.tsx` | Product detail page - View detailed information for a specific product |

#### Forecasting & AI Models
| Route | Page Component | Description |
|-------|---|---|
| `/forecasting` | `Forecasting.tsx` | Demand forecasting interface - AI-powered predictions |
| `/models` | `AIModels.tsx` | AI Models management - Configure and manage forecasting models |

#### Alerts & Notifications
| Route | Page Component | Description |
|-------|---|---|
| `/alerts` | `Alerts.tsx` | Alerts management - Set up and manage stock level alerts |
| `/notifications` | `Notifications.tsx` | Notifications center - View and manage all notifications |

#### Reports & Data
| Route | Page Component | Description |
|-------|---|---|
| `/reports` | `Reports.tsx` | Reports generation - Create and view various reports |
| `/data` | `DataManagement.tsx` | Data management - Import, export, and manage data |

#### Administration & User Management
| Route | Page Component | Description |
|-------|---|---|
| `/users` | `Users.tsx` | User management - Manage application users and permissions |
| `/suppliers` | `Suppliers.tsx` | Supplier management - Manage supplier directory and information |

#### User Settings
| Route | Page Component | Description |
|-------|---|---|
| `/profile` | `Profile.tsx` | User profile page - View and edit user information |
| `/settings` | `Settings.tsx` | Application settings - Configure user preferences and options |

### Error Routes

| Route | Page Component | Description |
|-------|---|---|
| `*` | `NotFound.tsx` | 404 Not Found - Displayed for unmatched routes |

### Special Features

- **Chatbot** - Floating AI assistant available on all authenticated pages (hidden on `/`, `/login`, `/register`)
- **Layout Wrapper** - All protected routes are wrapped with the `Layout` component providing the sidebar, header, and navigation

## �📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18+ (v20+ recommended)
- **npm** v9+ (comes with Node.js)

Verify your installation:

```bash
node --version
npm --version
```

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
# Clone the main repository
git clone https://github.com/Andri-RJ/PrediStock.git

# Navigate to the project directory
cd PrediStock

# Navigate to the frontend directory
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `frontend` directory with the following variables:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

> **Note:** Adjust the API URL to match your backend server configuration.

### 4. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Build the application for production |
| `npm run build:dev` | Build for production with development mode |
| `npm run lint` | Run ESLint to check code quality |
| `npm run preview` | Preview the production build locally |

## 🏗️ Building for Production

Create an optimized production build:

```bash
npm run build
```

The built files will be generated in the `dist/` directory. You can preview the production build locally:

```bash
npm run preview
```

## 🌐 API Configuration

The application communicates with a Django REST API backend. Configure the API endpoint in:

- **Environment variable:** `VITE_API_BASE_URL`
- **Config file:** `src/config/api.config.ts`

## 📝 Code Style & Quality

This project uses:

- **ESLint** for JavaScript/TypeScript linting
- **TypeScript** for static type checking
- **Prettier** (via Tailwind) for code formatting

Run the linter:

```bash
npm run lint
```