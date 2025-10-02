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
import { useEffect, useState } from "react"; // Importar useState

const queryClient = new QueryClient();

const AppContent = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isReadyToRenderRoutes, setIsReadyToRenderRoutes] = useState(false); // Novo estado

  useEffect(() => {
    console.log("AppContent: useEffect. Loading:", loading, "CurrentUser:", currentUser?.id, "Path:", location.pathname);
    const authRoutes = ['/login', '/register', '/forgot-password', '/update-password'];

    // Se a autenticação ainda estiver carregando, não faz nada.
    if (loading) {
      console.log("AppContent: Auth still loading, waiting...");
      setIsReadyToRenderRoutes(false); // Garante que as rotas não sejam renderizadas prematuramente
      return;
    }

    // Uma vez que o carregamento terminou, define isReadyToRenderRoutes como true após um pequeno atraso
    // Isso dá ao React Router tempo para processar qualquer navegação pendente.
    const timer = setTimeout(() => {
      setIsReadyToRenderRoutes(true);
    }, 100); // Atraso de 100ms

    return () => clearTimeout(timer); // Limpa o timer na desmontagem ou re-execução do efeito
  }, [loading]); // Depende apenas de 'loading' para controlar a prontidão das rotas

  useEffect(() => {
    // Esta lógica de navegação só deve ser executada quando as rotas estiverem prontas para serem renderizadas
    if (!isReadyToRenderRoutes) {
      console.log("AppContent: Routes not ready to render, skipping navigation logic.");
      return;
    }

    const authRoutes = ['/login', '/register', '/forgot-password', '/update-password'];

    // Se não estiver logado e não estiver em uma rota de autenticação, redirecionar para login.
    if (!currentUser && !authRoutes.includes(location.pathname)) {
      console.log("AppContent: Not logged in and not on auth route, navigating to /login.");
      navigate('/login');
      return;
    }

    // Se estiver logado e em uma rota de autenticação, redirecionar para a home.
    if (currentUser && authRoutes.includes(location.pathname)) {
      console.log("AppContent: Logged in and on auth route, navigating to /.");
      navigate('/');
      return;
    }

    console.log("AppContent: No navigation needed for current state.");

  }, [currentUser, isReadyToRenderRoutes, navigate, location.pathname]); // Depende de isReadyToRenderRoutes

  // Renderiza a tela de carregamento se a autenticação ainda estiver em progresso OU se as rotas não estiverem prontas
  if (loading || !isReadyToRenderRoutes) {
    console.log("AppContent: Showing global loading screen (loading: " + loading + ", isReadyToRenderRoutes: " + isReadyToRenderRoutes + ")");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-lg">Carregando autenticação...</p>
      </div>
    );
  }

  // Uma vez que o carregamento é falso e as rotas estão prontas, renderiza as rotas.
  console.log("AppContent: AuthProvider finished loading and routes are ready, rendering routes.");
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