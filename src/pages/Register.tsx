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

const Register = () => {
  const [step, setStep] = useState('enterPhone'); // 'enterPhone' or 'enterCode'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const navigate = useNavigate();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhone = `+55${phone.replace(/\D/g, '')}`;
    
    const { error } = await supabase.auth.signUp({
      phone: fullPhone,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Código de verificação enviado por SMS!');
      setStep('enterCode');
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhone = `+55${phone.replace(/\D/g, '')}`;

    const { data, error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: verificationCode,
      type: 'sms',
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Conta criada com sucesso!');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="mx-auto max-w-sm border-border">
        {step === 'enterPhone' ? (
          <>
            <CardHeader>
              <CardTitle className="text-3xl font-serif">Cadastro</CardTitle>
              <CardDescription>
                Crie sua conta para agendar seu horário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendCode}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="full-name">Nome Completo</Label>
                    <Input id="full-name" placeholder="Seu Nome" required value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Celular (com DDD)</Label>
                    <Input id="phone" type="tel" placeholder="21999998888" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full">
                    Enviar Código
                  </Button>
                </div>
              </form>
              <div className="mt-4 text-center text-sm">
                Já tem uma conta?{' '}
                <Link to="/login" className="underline text-primary">
                  Login
                </Link>
              </div>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-3xl font-serif">Verificar Código</CardTitle>
              <CardDescription>
                Digite o código que enviamos para o seu celular.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyCode}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="code">Código de Verificação</Label>
                    <Input id="code" placeholder="123456" required value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full">
                    Verificar e Criar Conta
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default Register;