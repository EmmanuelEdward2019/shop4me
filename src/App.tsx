import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AgentProtectedRoute from "@/components/auth/AgentProtectedRoute";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

// Public pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import HowItWorksPage from "./pages/HowItWorks";
import ForAgentsPage from "./pages/ForAgents";
import LocationsPage from "./pages/Locations";
import FAQPage from "./pages/FAQ";
import AuthPage from "./pages/Auth";

// Protected pages (Buyer)
import Dashboard from "./pages/Dashboard";
import OrdersPage from "./pages/Orders";
import OrderDetailPage from "./pages/OrderDetail";
import NewOrderPage from "./pages/NewOrder";
import WalletPage from "./pages/Wallet";
import AddressesPage from "./pages/Addresses";
import SettingsPage from "./pages/Settings";
import MessagesPage from "./pages/Messages";

// Agent pages
import AgentDashboard from "./pages/agent/AgentDashboard";
import AvailableOrders from "./pages/agent/AvailableOrders";
import AgentMyOrders from "./pages/agent/AgentMyOrders";
import AgentOrderDetail from "./pages/agent/AgentOrderDetail";
import AgentEarnings from "./pages/agent/AgentEarnings";
import AgentSettings from "./pages/agent/AgentSettings";
import AgentMessagesPage from "./pages/agent/AgentMessages";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminAgents from "./pages/admin/AdminAgents";
import AdminSettingsPage from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/for-agents" element={<ForAgentsPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/orders"
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/new-order"
              element={
                <ProtectedRoute>
                  <NewOrderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/wallet"
              element={
                <ProtectedRoute>
                  <WalletPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/addresses"
              element={
                <ProtectedRoute>
                  <AddressesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/messages"
              element={
                <ProtectedRoute>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />

            {/* Agent routes */}
            <Route
              path="/agent"
              element={
                <AgentProtectedRoute>
                  <AgentDashboard />
                </AgentProtectedRoute>
              }
            />
            <Route
              path="/agent/available-orders"
              element={
                <AgentProtectedRoute>
                  <AvailableOrders />
                </AgentProtectedRoute>
              }
            />
            <Route
              path="/agent/my-orders"
              element={
                <AgentProtectedRoute>
                  <AgentMyOrders />
                </AgentProtectedRoute>
              }
            />
            <Route
              path="/agent/orders/:id"
              element={
                <AgentProtectedRoute>
                  <AgentOrderDetail />
                </AgentProtectedRoute>
              }
            />
            <Route
              path="/agent/earnings"
              element={
                <AgentProtectedRoute>
                  <AgentEarnings />
                </AgentProtectedRoute>
              }
            />
            <Route
              path="/agent/settings"
              element={
                <AgentProtectedRoute>
                  <AgentSettings />
                </AgentProtectedRoute>
              }
            />
            <Route
              path="/agent/messages"
              element={
                <AgentProtectedRoute>
                  <AgentMessagesPage />
                </AgentProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminProtectedRoute>
                  <AdminUsers />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminProtectedRoute>
                  <AdminOrders />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/agents"
              element={
                <AdminProtectedRoute>
                  <AdminAgents />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminProtectedRoute>
                  <AdminSettingsPage />
                </AdminProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
