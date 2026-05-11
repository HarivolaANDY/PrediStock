import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Stock from "@/pages/Stock";
import Forecasting from "@/pages/Forecasting";
import Alerts from "@/pages/Alerts";
import DataManagement from "@/pages/DataManagement";
import AIModels from "@/pages/AIModels";
import Reports from "@/pages/Reports";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import ProductDetails from "@/pages/ProductDetails";
import Chatbot from "@/components/Chatbot";
import Suppliers from "@/pages/Suppliers";
import { AuthProvider } from "@/contexts/AuthContext";
import { SupplierProvider } from "@/contexts/SupplierContext";
import DashboardAdmin from "@/pages/DashboardAdmin";
import ProductManagerPage from "@/pages/ProductManagerPage";
import { useSettings } from "@/hooks/useSettings";

import AchatPage from "@/pages/achat-vente/AchatPage";
import VentePage from "@/pages/achat-vente/VentePage";
import RetoursPage from "@/pages/achat-vente/RetoursPage";
import AnalysePage from "@/pages/achat-vente/AnalysePage";
import MouvementsPage from "@/pages/achat-vente/MouvementsPage";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  const showChatbot = !["/", "/login", "/register"].includes(location.pathname);
  
  // Appliquer les paramètres du thème globalement
  useSettings();

  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/dashboard-admin" element={<Layout><DashboardAdmin /></Layout>} />
        <Route path="/products" element={<Layout><Products /></Layout>} />
        <Route path="/stock" element={<Layout><Stock /></Layout>} />
        <Route path="/forecasting" element={<Layout><Forecasting /></Layout>} />
        <Route path="/alerts" element={<Layout><Alerts /></Layout>} />
        <Route path="/data" element={<Layout><DataManagement /></Layout>} />
        <Route path="/models" element={<Layout><AIModels /></Layout>} />
        <Route path="/reports" element={<Layout><Reports /></Layout>} />
        <Route path="/suppliers" element={<Layout><Suppliers /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
        <Route path="/product/:id" element={<Layout><ProductDetails /></Layout>} />
        <Route path="/product" element={<Layout><Products /></Layout>} />
        <Route path="/product-manager" element={<Layout><ProductManagerPage /></Layout>} />

        <Route path="/buy-sell/achats" element={<Layout><AchatPage /></Layout>} />
        <Route path="/buy-sell/ventes" element={<Layout><VentePage /></Layout>} />
        <Route path="/buy-sell/retours" element={<Layout><RetoursPage /></Layout>} />
        <Route path="/buy-sell/analyse" element={<Layout><AnalysePage /></Layout>} />
        <Route path="/buy-sell/mouvements" element={<Layout><MouvementsPage /></Layout>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      {showChatbot && <Chatbot />}
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SupplierProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </SupplierProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
