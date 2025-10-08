import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

const Index = () => {
  const { currentUser, profile, logout, isEmailVerified } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center p-8">
        <img
          src="https://fhneddlnsiccucvmuftm.supabase.co/storage/v1/object/public/foto%20logo/Logo-Barbearia.png"
          alt="Barbearia AF Logo"
          className="mx-auto mb-8 w-48 h-48 object-contain"
        />
        <h1 className="text-6xl font-serif font-bold mb-4 text-foreground">Bem-vindo à Barbearia AF</h1>
        {currentUser && profile ? (
          <div>
            <p className="text-xl text-muted-foreground mb-2">
              Olá, {profile.full_name}! O que vamos fazer hoje?
            </p>
            {/* Removido o status de verificação do e-mail */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
               <Button asChild size="lg">
                <Link to="/new-appointment">Novo Agendamento</Link>
              </Button>
              {profile.role === 'admin' && (
                <Button asChild variant="secondary" size="lg">
                  <Link to="/admin/dashboard">Painel do Barbeiro</Link>
                </Button>
              )}
              <Button variant="outline" onClick={logout}>
                Sair
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xl text-muted-foreground mb-8">
              Agende seu horário de forma rápida e fácil.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/register">Cadastre-se</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;