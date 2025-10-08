import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
  currentUser: User | null | undefined; // undefined para indicar estado de carregamento inicial
  profile: Profile | null;
  isEmailVerified: boolean; // Adicionado: status de verificação do e-mail
  login: (email, password) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  console.log("AuthContext: AuthProvider renderizado.");
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined); // undefined para indicar carregamento
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialLoadCompleteRef = useRef(false); // Usando useRef para initialLoadComplete
  const navigate = useNavigate();

  // Deriva o status de verificação do e-mail
  const isEmailVerified = !!currentUser?.email_confirmed_at;

  // Helper function to fetch or create profile
  const fetchOrCreateProfile = async (user: User) => {
    console.log("AuthContext: fetchOrCreateProfile chamado para o usuário:", user.id);
    const PROFILE_FETCH_TIMEOUT = 5000; // 5 segundos de tempo limite para a busca do perfil

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

      if (profileError && 'code' in profileError && (profileError as any).code !== 'PGRST116') { 
        console.error("AuthContext: Erro ao carregar perfil (fetchOrCreateProfile):", profileError);
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
      
      console.log("AuthContext: Perfil carregado:", userProfile);
      return userProfile;

    } catch (e) {
      console.error("AuthContext: Erro inesperado em fetchOrCreateProfile:", e);
      showError("Erro inesperado ao buscar/criar perfil.");
      return null;
    }
  };

  useEffect(() => {
    console.log("AuthContext: useEffect iniciado.");
    setLoading(true); // Garante que o estado de carregamento seja true no início

    // Watchdog para o processo de autenticação inicial
    const initialLoadTimeout = setTimeout(() => {
      if (!initialLoadCompleteRef.current) { // Verifica o valor atual do ref
        console.error("AuthContext: Processo de autenticação inicial excedeu o tempo limite. Forçando limpeza de sessão e recarregamento.");
        showError("O carregamento da sessão excedeu o tempo limite. Limpando dados e recarregando.");
        // Tenta fazer logout para limpar o armazenamento local do Supabase, depois força o recarregamento
        supabase.auth.signOut().then(() => {
          window.location.reload();
        }).catch(e => {
          console.error("AuthContext: Erro durante signOut no timeout:", e);
          window.location.reload(); // Fallback para recarregamento direto
        });
      }
    }, 10000); // 10 segundos de tempo limite para o carregamento inicial

    const handleAuthSession = async (session: Session | null) => {
      if (session?.user) {
        setCurrentUser(session.user);
        console.log("AuthContext: Current user set. Email confirmed at:", session.user.email_confirmed_at); // LOG DE DEPURACAO
        const userProfile = await fetchOrCreateProfile(session.user);
        if (userProfile) {
          setProfile(userProfile);
        } else {
          console.error("AuthContext: Falha ao carregar/criar perfil. Forçando logout.");
          showError('Não foi possível carregar os dados do perfil. Por favor, faça login novamente.');
          await supabase.auth.signOut();
          setCurrentUser(null);
          setProfile(null);
        }
      } else {
        setCurrentUser(null);
        setProfile(null);
      }
    };

    // Função assíncrona principal para o carregamento inicial
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        await handleAuthSession(initialSession);
      } catch (e) {
        console.error("AuthContext: Erro inesperado durante a inicialização da autenticação:", e);
        showError("Erro inesperado na inicialização da autenticação. Por favor, tente novamente.");
        setCurrentUser(null);
        setProfile(null);
        await supabase.auth.signOut(); // Garante a limpeza mesmo em erro inicial
      } finally {
        setLoading(false);
        initialLoadCompleteRef.current = true;
        console.log("AuthContext: initializeAuth finalizado. Loading set to false, initialLoadCompleteRef.current set to true.");
      }
    };

    initializeAuth(); // Chama a função de inicialização principal

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("AuthContext: onAuthStateChange event:", _event, "session:", session?.user?.id);
      // Se o evento for INITIAL_SESSION, já lidamos com ele acima com getSession(), então podemos ignorá-lo aqui.
      // Isso evita o processamento duplo da sessão inicial.
      if (_event === 'INITIAL_SESSION') {
        console.log("AuthContext: onAuthStateChange ignorando INITIAL_SESSION, já tratado por getSession().");
        return;
      }
      // Para outros eventos (SIGNED_IN, SIGNED_OUT, USER_UPDATED), processa a sessão.
      // Não gerenciamos o estado `loading` aqui, pois é para o carregamento inicial do aplicativo.
      await handleAuthSession(session);
    });

    return () => {
      clearTimeout(initialLoadTimeout); // Limpa o watchdog se o processo de autenticação terminar normalmente
      subscription.unsubscribe();
    };
  }, []); // Array de dependências vazio para rodar apenas uma vez na montagem

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
    isEmailVerified, // Adicionado ao valor do contexto
    login,
    logout,
  };

  console.log("AuthContext: Renderizando AuthProvider. Loading:", loading, "CurrentUser:", currentUser?.id, "Email Verified:", isEmailVerified);

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