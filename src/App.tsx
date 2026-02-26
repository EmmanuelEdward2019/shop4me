import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AgentProtectedRoute from "@/components/auth/AgentProtectedRoute";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";
import RiderProtectedRoute from "@/components/auth/RiderProtectedRoute";

// Public pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import HowItWorksPage from "./pages/HowItWorks";
import ForAgentsPage from "./pages/ForAgents";
import LocationsPage from "./pages/Locations";
import FAQPage from "./pages/FAQ";
import AuthPage from "./pages/Auth";
import AboutUs from "./pages/AboutUs";
import Careers from "./pages/Careers";
import Press from "./pages/Press";
import HelpCenter from "./pages/HelpCenter";
import ContactUs from "./pages/ContactUs";
import Safety from "./pages/Safety";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import Newsletter from "./pages/Newsletter";

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
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminAgents from "./pages/admin/AdminAgents";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminSettingsPage from "./pages/admin/AdminSettings";
import AdminSubmissions from "./pages/admin/AdminSubmissions";
import AdminInvoices from "./pages/admin/AdminInvoices";

// Blog pages
import Blog from "./pages/Blog";
import BlogPostPage from "./pages/BlogPost";

// Agent Application
import AgentApplication from "./pages/AgentApplication";
import RiderApplication from "./pages/RiderApplication";

// Rider pages
import RiderDashboard from "./pages/rider/RiderDashboard";
import RiderAvailablePickups from "./pages/rider/AvailablePickups";
import RiderMyDeliveries from "./pages/rider/RiderMyDeliveries";
import RiderSettings from "./pages/rider/RiderSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
          {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/for-agents" element={<ForAgentsPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/agent-application" element={<AgentApplication />} />
            <Route path="/rider-application" element={<RiderApplication />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/press" element={<Press />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/newsletter" element={<Newsletter />} />

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
              path="/admin/orders/:id"
              element={
                <AdminProtectedRoute>
                  <AdminOrderDetail />
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
              path="/admin/applications"
              element={
                <AdminProtectedRoute>
                  <AdminApplications />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/messages"
              element={
                <AdminProtectedRoute>
                  <AdminMessages />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/blog"
              element={
                <AdminProtectedRoute>
                  <AdminBlog />
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
            <Route
              path="/admin/submissions"
              element={
                <AdminProtectedRoute>
                  <AdminSubmissions />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/invoices"
              element={
                <AdminProtectedRoute>
                  <AdminInvoices />
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
