import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AuthProvider } from "@/contexts/AuthContext";
import { SupplierProvider } from "@/contexts/SupplierContext";
import { useSettings } from "@/hooks/useSettings";

// Pages chargées immédiatement (page de login first paint rapide)
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

// Pages chargées à la demande (lazy loading)
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Products = lazy(() => import("@/pages/Products"));
const Stock = lazy(() => import("@/pages/Stock"));
const Forecasting = lazy(() => import("@/pages/Forecasting"));
const Alerts = lazy(() => import("@/pages/Alerts"));
const DataManagement = lazy(() => import("@/pages/DataManagement"));
const AIModels = lazy(() => import("@/pages/AIModels"));
const Reports = lazy(() => import("@/pages/Reports"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Settings = lazy(() => import("@/pages/Settings"));
const Register = lazy(() => import("@/pages/Register"));
const Profile = lazy(() => import("@/pages/Profile"));
const ProductDetails = lazy(() => import("@/pages/ProductDetails"));
const Chatbot = lazy(() => import("@/components/Chatbot"));
const Suppliers = lazy(() => import("@/pages/Suppliers"));
const DashboardAdmin = lazy(() => import("@/pages/DashboardAdmin"));
const ProductManagerPage = lazy(() => import("@/pages/ProductManagerPage"));

const AchatPage = lazy(() => import("@/pages/achat-vente/AchatPage"));
const VentePage = lazy(() => import("@/pages/achat-vente/VentePage"));
const RetoursPage = lazy(() => import("@/pages/achat-vente/RetoursPage"));
const AnalysePage = lazy(() => import("@/pages/achat-vente/AnalysePage"));
const MouvementsPage = lazy(() => import("@/pages/achat-vente/MouvementsPage"));

const queryClient = new QueryClient();

const PageLoading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const AppContent = () => {
  const location = useLocation();
  const showChatbot = !["/", "/login", "/register"].includes(location.pathname);

  useSettings();

  return (
    <>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Suspense fallback={<PageLoading />}><Register /></Suspense>} />
        <Route path="/dashboard" element={<Layout><Suspense fallback={<PageLoading />}><Dashboard /></Suspense></Layout>} />
        <Route path="/dashboard-admin" element={<Layout><Suspense fallback={<PageLoading />}><DashboardAdmin /></Suspense></Layout>} />
        <Route path="/products" element={<Layout><Suspense fallback={<PageLoading />}><Products /></Suspense></Layout>} />
        <Route path="/stock" element={<Layout><Suspense fallback={<PageLoading />}><Stock /></Suspense></Layout>} />
        <Route path="/forecasting" element={<Layout><Suspense fallback={<PageLoading />}><Forecasting /></Suspense></Layout>} />
        <Route path="/alerts" element={<Layout><Suspense fallback={<PageLoading />}><Alerts /></Suspense></Layout>} />
        <Route path="/data" element={<Layout><Suspense fallback={<PageLoading />}><DataManagement /></Suspense></Layout>} />
        <Route path="/models" element={<Layout><Suspense fallback={<PageLoading />}><AIModels /></Suspense></Layout>} />
        <Route path="/reports" element={<Layout><Suspense fallback={<PageLoading />}><Reports /></Suspense></Layout>} />
        <Route path="/suppliers" element={<Layout><Suspense fallback={<PageLoading />}><Suppliers /></Suspense></Layout>} />
        <Route path="/profile" element={<Layout><Suspense fallback={<PageLoading />}><Profile /></Suspense></Layout>} />
        <Route path="/notifications" element={<Layout><Suspense fallback={<PageLoading />}><Notifications /></Suspense></Layout>} />
        <Route path="/settings" element={<Layout><Suspense fallback={<PageLoading />}><Settings /></Suspense></Layout>} />
        <Route path="/product/:id" element={<Layout><Suspense fallback={<PageLoading />}><ProductDetails /></Suspense></Layout>} />
        <Route path="/product" element={<Layout><Suspense fallback={<PageLoading />}><Products /></Suspense></Layout>} />
        <Route path="/product-manager" element={<Layout><Suspense fallback={<PageLoading />}><ProductManagerPage /></Suspense></Layout>} />

        <Route path="/buy-sell/achats" element={<Layout><Suspense fallback={<PageLoading />}><AchatPage /></Suspense></Layout>} />
        <Route path="/buy-sell/ventes" element={<Layout><Suspense fallback={<PageLoading />}><VentePage /></Suspense></Layout>} />
        <Route path="/buy-sell/retours" element={<Layout><Suspense fallback={<PageLoading />}><RetoursPage /></Suspense></Layout>} />
        <Route path="/buy-sell/analyse" element={<Layout><Suspense fallback={<PageLoading />}><AnalysePage /></Suspense></Layout>} />
        <Route path="/buy-sell/mouvements" element={<Layout><Suspense fallback={<PageLoading />}><MouvementsPage /></Suspense></Layout>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      {showChatbot && <Suspense fallback={null}><Chatbot /></Suspense>}
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <SupplierProvider>
              <AppContent />
            </SupplierProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

