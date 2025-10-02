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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Helper function to fetch or create profile
  const fetchOrCreateProfile = async (user: User) => {
    console.log("AuthContext: fetchOrCreateProfile chamado para o usuário:", user.id);
    console.log("AuthContext: Objeto Supabase:", supabase); // NOVO LOG: Verificando o objeto supabase

    try {
      // --- Consulta de teste para verificar a funcionalidade básica do Supabase ---
      console.log("AuthContext: TESTE - Tentando consultar a tabela 'services'...");
      const { data: testData, error: testError } = await supabase
        .from('services')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error("AuthContext: TESTE - Erro na consulta de 'services':", testError);
        showError('Erro de teste Supabase: ' + testError.message);
        // Não retornamos aqui, continuamos para a consulta de perfil para ver se o problema é específico
      } else {
        console.log("AuthContext: TESTE - Consulta de 'services' bem-sucedida:", testData);
      }
      // --- Fim da consulta de teste ---

      console.log("AuthContext: PRE-QUERY - Tentando consultar perfil no Supabase para ID:", user.id);
      let { data: userProfileArray, error: profileError } = await supabase
        .from('profiles')
        .select('id') // SIMPLIFICADO PARA APENAS 'id' para depuração
        .eq('id', user.id);

      console.log("AuthContext: AFTER AWAIT - Consulta de perfil Supabase concluída.");
      
      const userProfile = userProfileArray && userProfileArray.length > 0 ? userProfileArray[0] : null;

      console.log("AuthContext: Resultado da consulta de perfil Supabase:", userProfile, "Erro:", profileError);

      if (profileError) {
        console.error("AuthContext: Erro ao carregar perfil:", profileError);
        showError('Erro ao carregar perfil: ' + profileError.message);
        return null;
      }
      
      if (!userProfile) {
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
      }
      
      const { data: fullProfile, error: fullProfileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url, phone_number')
        .eq('id', user.id)
        .single();

      if (fullProfileError) {
        console.error("AuthContext: Erro ao carregar perfil completo após ID:", fullProfileError);
        showError('Erro ao carregar perfil completo: ' + fullProfileError.message);
        return null;
      }

      console.log("AuthContext: Perfil carregado:", fullProfile);
      return fullProfile;

    } catch (e) {
      console.error("AuthContext: Erro inesperado em fetchOrCreateProfile:", e);
      showError("Erro inesperado ao buscar/criar perfil.");
      return null;
    }
  };

  useEffect(() => {
    setLoading(true);

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
      setLoading(false);
      console.log("AuthContext: onAuthStateChange process finished, loading set to false.");
    });

    return () => subscription.unsubscribe();
  }, []);

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
        await supabase.auth.signOut();
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