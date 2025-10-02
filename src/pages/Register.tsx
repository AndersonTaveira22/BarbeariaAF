import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone_number: phone,
        },
      },
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Cadastro realizado! Por favor, verifique seu e-mail para confirmar sua conta.');
      navigate('/login');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/photo.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <Card className="mx-auto max-w-sm w-full border-border relative z-10 bg-card/90 shadow-2xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-serif text-primary">Crie sua conta</CardTitle>
          <CardDescription className="text-muted-foreground">
            Preencha os dados abaixo para agendar seu horário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="full-name">Nome Completo</Label>
              <Input 
                id="full-name" 
                placeholder="Seu Nome" 
                required 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="bg-background/50 border-input focus:border-primary"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="bg-background/50 border-input focus:border-primary"
              />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="(XX) XXXXX-XXXX" 
                  required 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  className="bg-background/50 border-input focus:border-primary"
                />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'}
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="bg-background/50 border-input focus:border-primary pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full text-lg py-6 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
              Criar Conta
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link to="/login" className="underline text-primary hover:text-primary/80 font-medium">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;