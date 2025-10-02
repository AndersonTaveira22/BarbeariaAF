import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
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
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useEffect } from "react";

const queryClient = new QueryClient();

const AppContent = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log("AppContent: useEffect. Loading:", loading, "CurrentUser:", currentUser?.id, "Path:", location.pathname);
    const authRoutes = ['/login', '/register', '/forgot-password', '/update-password'];

    // Se a autenticação ainda estiver carregando, não faz nada.
    if (loading) {
      console.log("AppContent: Auth still loading, waiting...");
      return;
    }

    // Se não estiver logado e não estiver em uma rota de autenticação, redirecionar para login.
    if (!currentUser && !authRoutes.includes(location.pathname)) {
      console.log("AppContent: Não logado e não em rota de autenticação, redirecionando para /login");
      navigate('/login');
      return;
    }

    // Se estiver logado e em uma rota de autenticação, redirecionar para a home.
    if (currentUser && authRoutes.includes(location.pathname)) {
      console.log("AppContent: Logado e em rota de autenticação, redirecionando para /.");
      navigate('/');
      return;
    }

    console.log("AppContent: No navigation needed for current state.");

  }, [currentUser, loading, navigate, location.pathname]);

  // Renderiza a tela de carregamento se a autenticação ainda estiver em progresso
  if (loading) {
    console.log("AppContent: Showing global loading screen (loading: " + loading + ")");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-lg">Carregando autenticação...</p>
      </div>
    );
  }

  // Uma vez que o carregamento é falso, renderiza as rotas.
  console.log("AppContent: AuthProvider finished loading, rendering routes.");
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