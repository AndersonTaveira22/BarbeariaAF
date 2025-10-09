import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff } from 'lucide-react'; // Importando os ícones

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Novo estado para controlar a visibilidade da senha
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <img
        src="https://fhneddlnsiccucvmuftm.supabase.co/storage/v1/object/public/foto%20logo/Logo-Barbearia.png"
        alt="Barbearia AF Logo"
        className="mx-auto mb-8 w-32 h-32 object-contain"
      />
      <Card className="mx-auto max-w-sm border-border w-full">
        <CardHeader>
          <CardTitle className="text-3xl font-serif">Login</CardTitle>
          <CardDescription>
            Entre com seu email para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Senha</Label>
              </div>
              <div className="relative"> {/* Adicionado um container relativo para posicionar o botão */}
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'} // Alterna o tipo do input
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10" // Adiciona padding à direita para o botão
                />
                <Button
                  type="button" // Importante para não submeter o formulário
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-1"
                  onClick={() => setShowPassword((prev) => !prev)} // Alterna o estado
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Não tem uma conta?{' '}
            <Link to="/register" className="underline text-primary">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;