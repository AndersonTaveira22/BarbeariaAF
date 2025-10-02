import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import BackButton from '@/components/BackButton';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Opcional: Redirecionar o usuário para uma página específica após clicar no link do e-mail
      // Por exemplo: redirectTo: `${window.location.origin}/update-password`
      // Por enquanto, vamos apenas informar o usuário para verificar o e-mail.
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Verifique seu e-mail para um link de redefinição de senha!');
      navigate('/login'); // Redireciona para a página de login após o envio
    }
    setIsSubmitting(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/photo.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <Card className="mx-auto max-w-sm w-full border-border relative z-10 bg-card/90 shadow-2xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-serif text-primary">Redefinir Senha</CardTitle>
          <CardDescription className="text-muted-foreground">
            Insira seu e-mail para receber um link de redefinição de senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-6">
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
            <Button type="submit" className="w-full text-lg py-6 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Redefinir Senha'}
            </Button>
          </form>
          <div className="mt-6">
            <BackButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;