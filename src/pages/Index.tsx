import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

const Index = () => {
  const { currentUser, profile, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center p-8">
        <h1 className="text-6xl font-serif font-bold mb-4 text-foreground">Bem-vindo à Barbearia AF</h1>
        {currentUser && profile ? (
          <div>
            <p className="text-xl text-muted-foreground mb-8">
              Olá, {profile.full_name}! O que vamos fazer hoje?
            </p>
            <div className="space-x-4">
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
            <div className="space-x-4">
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
      <div className="absolute bottom-4">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;