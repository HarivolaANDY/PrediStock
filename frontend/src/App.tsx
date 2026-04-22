import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Stock from "./pages/Stock";
import Forecasting from "./pages/Forecasting";
import Alerts from "./pages/Alerts";
import DataManagement from "./pages/DataManagement";
import AIModels from "./pages/AIModels";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import ProductDetails from "./pages/ProductDetails";
import Chatbot from "./components/Chatbot";
import Suppliers from "./pages/Suppliers";
import { AuthProvider } from "./contexts/AuthContext";
import { SupplierProvider } from "./contexts/SupplierContext";
import Activite from "./components/Activitelist";
import DashboardAdmin from "./pages/DashboardAdmin";
import ProductManagerPage from "./pages/ProductManagerPage";
import { useState } from "react";

const queryClient = new QueryClient();

const App = () => {
  const [authboolean] = useState<boolean>(() => !!localStorage.getItem("token"));

  // Détermine si le chatbot doit être affiché (pas sur /, /login, /register)
  const showChatbot = !["/", "/login", "/register"].includes(location.pathname);

  return (  
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SupplierProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Root Route */}
                <Route path="/" element={<Index />} />

                {/* Authentication Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Main Application Routes */}
                <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
                <Route path="/dashboard-admin" element={<Layout><DashboardAdmin /></Layout>} />
                <Route path="/products" element={<Layout><Products /></Layout>} />
                <Route path="/stock" element={<Layout><Stock /></Layout>} />
                <Route path="/forecasting" element={<Layout><Forecasting /></Layout>} />
                <Route path="/alerts" element={<Layout><Alerts /></Layout>} />
                <Route path="/data" element={<Layout><DataManagement /></Layout>} />
                <Route path="/models" element={<Layout><AIModels /></Layout>} />
                <Route path="/reports" element={<Layout><Reports /></Layout>} />
                <Route path="/users" element={<Layout><Users /></Layout>} />
                <Route path="/suppliers" element={<Layout><Suppliers /></Layout>} />
                <Route path="/profile" element={<Layout><Profile /></Layout>} />
                <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
                <Route path="/settings" element={<Layout><Settings /></Layout>} />
                <Route path="/product/:id" element={<Layout><ProductDetails/></Layout>} />
                <Route path="product" element={<Layout><Products/></Layout>}/>
                <Route path="/activite" element={<Layout><Activite/></Layout>}/>
                <Route path="/product-manager" element={<Layout><ProductManagerPage /></Layout>} />

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            {showChatbot && <Chatbot />}
          </TooltipProvider>
        </SupplierProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;