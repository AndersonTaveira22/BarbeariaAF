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
  console.log("AuthContext: AuthProvider renderizado.");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Helper function to fetch or create profile
  const fetchOrCreateProfile = async (user: User) => {
    console.log("AuthContext: fetchOrCreateProfile chamado para o usuário:", user.id);
    const PROFILE_FETCH_TIMEOUT = 10000; // Aumentado para 10 segundos
    console.log(`AuthContext: Tempo limite para consulta de perfil: ${PROFILE_FETCH_TIMEOUT / 1000}s`);

    try {
      console.log("AuthContext: Tentando consultar perfil no Supabase para ID:", user.id);
      
      const profileFetchPromise = supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url, phone_number')
        .eq('id', user.id)
        .single();

      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => {
          console.warn("AuthContext: Consulta de perfil excedeu o tempo limite.");
          resolve(null); // Resolve com null para indicar tempo limite
        }, PROFILE_FETCH_TIMEOUT)
      );

      const result = await Promise.race([profileFetchPromise, timeoutPromise]);

      if (result === null) { // Tempo limite ocorreu
        console.error("AuthContext: Falha ao carregar perfil devido a tempo limite.");
        return null;
      }

      const { data: userProfile, error: profileError } = result as { data: Profile | null, error: Error | null };

      console.log("AuthContext: Consulta de perfil Supabase concluída.");
      console.log("AuthContext: Resultado da consulta de perfil Supabase (fetchOrCreateProfile):", userProfile, "Erro:", profileError);

      if (profileError) {
        if ('code' in profileError && (profileError as any).code !== 'PGRST116') { 
          console.error("AuthContext: Erro ao carregar perfil (fetchOrCreateProfile):", profileError);
          showError('Erro ao carregar perfil: ' + profileError.message);
          return null;
        } else if ('code' in profileError && (profileError as any).code === 'PGRST116') {
          console.log("AuthContext: Perfil não encontrado (PGRST116), tentando criar um novo.");
        } else {
          console.error("AuthContext: Erro inesperado ao carregar perfil (sem código PGRST116):", profileError);
          showError('Erro inesperado ao carregar perfil: ' + profileError.message);
          return null;
        }
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
      
      console.log("AuthContext: Perfil carregado:", userProfile);
      return userProfile;

    } catch (e) {
      console.error("AuthContext: Erro inesperado em fetchOrCreateProfile:", e);
      showError("Erro inesperado ao buscar/criar perfil.");
      return null;
    }
  };

  // Função de logout estável
  const logout = async () => {
    console.log("AuthContext: Tentando logout para:", currentUser?.id);
    await supabase.auth.signOut();
    setProfile(null);
    setCurrentUser(null);
    showSuccess('Você foi desconectado.');
    navigate('/login');
  };

  useEffect(() => {
    console.log("AuthContext: useEffect iniciado. Setting loading to true.");
    setLoading(true); // Garante que loading seja true no início do efeito

    let authSubscription: { unsubscribe: () => void } | null = null;
    // Removido globalTimeoutId, pois onAuthStateChange está disparando e fetchOrCreateProfile tem seu próprio timeout.

    const setupAuthListener = async () => {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => { // Corrigido aqui
        console.log("AuthContext: onAuthStateChange event:", _event, "session:", session?.user?.id);
        
        try {
          if (session?.user) {
            setCurrentUser(session.user);
            const userProfile = await fetchOrCreateProfile(session.user);
            if (userProfile) {
              setProfile(userProfile);
            } else {
              // Se o perfil não pôde ser carregado/criado (incluindo por tempo limite), a sessão pode estar em um estado ruim.
              console.error("AuthContext: Falha ao carregar/criar perfil. Forçando logout e redirecionamento.");
              showError('Não foi possível carregar os dados do perfil. Por favor, faça login novamente.');
              await supabase.auth.signOut();
              setCurrentUser(null);
              setProfile(null);
              setLoading(false); // Garante que loading seja false antes de navegar
              navigate('/login'); 
              return; // Sai cedo após a navegação
            }
          } else {
            setCurrentUser(null);
            setProfile(null);
            // Se não há sessão, e não estamos em uma página de autenticação, navega para login
            const currentPath = window.location.pathname;
            if (!['/login', '/register', '/forgot-password', '/update-password'].includes(currentPath)) {
                setLoading(false); // Garante que loading seja false antes de navegar
                navigate('/login');
                return; // Sai cedo após a navegação
            }
          }
        } catch (e) {
          console.error("AuthContext: Erro inesperado no onAuthStateChange:", e);
          showError("Erro inesperado na autenticação. Por favor, tente novamente.");
          setCurrentUser(null);
          setProfile(null);
          await supabase.auth.signOut();
          setLoading(false); // Garante que loading seja false antes de navegar
          navigate('/login'); 
          return; // Sai cedo após a navegação
        } finally {
          // Este bloco finally só será alcançado se nenhuma saída antecipada (return) tiver ocorrido.
          // Se já navegamos, loading já é false. Caso contrário, definimos aqui.
          if (loading) { // Só define como false se ainda for true
             setLoading(false); 
          }
          console.log("AuthContext: onAuthStateChange process finished, loading set to false.");
        }
      });
      authSubscription = data.subscription; // Atribui a subscription corretamente
    };

    setupAuthListener();

    return () => {
      console.log("AuthContext: useEffect cleanup.");
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [navigate, loading]); // Adicionado loading às dependências para garantir que a lógica do finally esteja correta

  const login = async (email, password) => {
    console.log("AuthContext: Tentando login para:", email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("AuthContext: Erro no login:", error);
      showError(error.message);
    } else if (data.user) {
      console.log("AuthContext: Login bem-sucedido para:", data.user.id);
      // onAuthStateChange irá lidar com a definição de currentUser e profile
      showSuccess('Login realizado com sucesso!');
      navigate('/');
    }
  };

  const value = {
    currentUser,
    profile,
    login,
    logout,
  };

  console.log("AuthContext: Renderizando AuthProvider. Loading:", loading, "CurrentUser:", currentUser?.id);

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <p className="text-lg">Carregando autenticação...</p>
        </div>
      ) : (
        // Adicionado um console.log para verificar o estado de loading antes de renderizar children
        <>
          {console.log("AuthContext: Renderizando children. Loading:", loading, "CurrentUser:", currentUser?.id)}
          {children}
        </>
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