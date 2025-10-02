import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  full_name: string;
  role: 'cliente' | 'admin';
  avatar_url: string;
  phone_number?: string;
}

interface AuthContextType {
  currentUser: User | null;
  profile: Profile | null;
  login: (email, password) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Inicializado como null
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // Começa como true
  const navigate = useNavigate();

  // Helper function to fetch or create profile
  const fetchOrCreateProfile = async (user: User) => {
    let { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') { // No rows found
      console.log("AuthContext: Perfil não encontrado, criando um novo.");
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: user.id, full_name: user.email?.split('@')[0] || 'Usuário Novo', role: 'cliente' })
        .select()
        .single();

      if (insertError) {
        console.error("AuthContext: Erro ao criar perfil básico:", insertError);
        showError('Erro ao criar perfil básico: ' + insertError.message);
        return null;
      }
      showSuccess('Perfil criado automaticamente.');
      return newProfile;
    } else if (profileError) {
      console.error("AuthContext: Erro ao carregar perfil:", profileError);
      showError('Erro ao carregar perfil: ' + profileError.message);
      return null;
    }
    console.log("AuthContext: Perfil carregado:", userProfile);
    return userProfile;
  };

  useEffect(() => {
    setLoading(true); // Garante que o estado de carregamento seja true ao iniciar o listener

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("AuthContext: onAuthStateChange event:", _event, "session:", session?.user?.id);
      
      if (session?.user) {
        setCurrentUser(session.user);
        const userProfile = await fetchOrCreateProfile(session.user);
        setProfile(userProfile);
      } else {
        setCurrentUser(null);
        setProfile(null);
      }
      setLoading(false); // Define loading como false APÓS processar o estado de autenticação
      console.log("AuthContext: onAuthStateChange process finished, loading set to false.");
    });

    return () => subscription.unsubscribe();
  }, []); // O array de dependências vazio garante que o useEffect rode apenas uma vez na montagem

  const login = async (email, password) => {
    console.log("AuthContext: Tentando login para:", email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("AuthContext: Erro no login:", error);
      showError(error.message);
    } else if (data.user) {
      console.log("AuthContext: Login bem-sucedido para:", data.user.id);
      const userProfile = await fetchOrCreateProfile(data.user);

      if (userProfile) {
        setProfile(userProfile);
        setCurrentUser(data.user);
        showSuccess('Login realizado com sucesso!');
        navigate('/');
      } else {
        console.error("AuthContext: Falha ao carregar/criar perfil após login.");
        showError('Não foi possível carregar ou criar os dados do perfil. Por favor, tente novamente.');
        await supabase.auth.signOut(); // Desloga se o perfil falhar
      }
    }
  };

  const logout = async () => {
    console.log("AuthContext: Tentando logout para:", currentUser?.id);
    await supabase.auth.signOut();
    setProfile(null);
    setCurrentUser(null);
    showSuccess('Você foi desconectado.');
    navigate('/login');
  };

  const value = {
    currentUser,
    profile,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <p className="text-lg">Carregando autenticação...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};