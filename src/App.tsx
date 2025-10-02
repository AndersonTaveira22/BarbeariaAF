import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom"; // Importar useNavigate e useLocation
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import NewAppointment from "./pages/NewAppointment";
import AdminDashboard from "./pages/admin/Dashboard";
import Availability from "./pages/admin/Availability";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext"; // Importar useAuth
import { useEffect } from "react"; // Importar useEffect

const queryClient = new QueryClient();

const AppContent = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log("AppContent: useEffect. Loading:", loading, "CurrentUser:", currentUser?.id, "Path:", location.pathname);
    // Se não estiver carregando e não houver usuário, e não estivermos em uma rota de autenticação, redirecionar para login
    if (!loading && !currentUser) {
      const authRoutes = ['/login', '/register', '/forgot-password', '/update-password'];
      if (!authRoutes.includes(location.pathname)) {
        console.log("AppContent: Não logado e não em rota de autenticação, redirecionando para /login");
        navigate('/login');
      }
    }
  }, [currentUser, loading, navigate, location.pathname]);

  // Se o AuthProvider ainda estiver carregando, mostre a tela de carregamento global
  if (loading) {
    console.log("AppContent: AuthProvider ainda está carregando, mostrando tela de carregamento.");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-lg">Carregando autenticação...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/new-appointment" element={<NewAppointment />} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/availability" element={<ProtectedRoute><Availability /></ProtectedRoute>} />

      {/* Catch-all Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppContent /> {/* Renderiza o AppContent dentro do AuthProvider */}
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;