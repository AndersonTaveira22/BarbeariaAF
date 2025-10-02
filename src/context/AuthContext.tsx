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
  const [currentUser, setCurrentUser] = useState<User | null>(undefined); // undefined para indicar estado inicial de carregamento
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Helper function to fetch or create profile
  const fetchOrCreateProfile = async (user: User) => {
    console.log("AuthContext: fetchOrCreateProfile chamado para o usuário:", user.id);
    try {
      console.log("AuthContext: Tentando consultar perfil no Supabase para ID:", user.id);
      let { data: userProfileArray, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url, phone_number')
        .eq('id', user.id);

      console.log("AuthContext: Consulta de perfil Supabase concluída.");
      
      const userProfile = userProfileArray && userProfileArray.length > 0 ? userProfileArray[0] : null;

      console.log("AuthContext: Resultado da consulta de perfil Supabase (fetchOrCreateProfile):", userProfile, "Erro:", profileError);

      if (profileError) {
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
    setLoading(true);

    const loadInitialSession = async () => {
      console.log("AuthContext: Tentando carregar sessão inicial com supabase.auth.getSession()...");
      const SESSION_LOAD_TIMEOUT = 5000; // 5 segundos de tempo limite

      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => {
            console.warn("AuthContext: supabase.auth.getSession() excedeu o tempo limite.");
            resolve(null); // Resolve com null para indicar tempo limite
          }, SESSION_LOAD_TIMEOUT)
        );

        const result = await Promise.race([sessionPromise, timeoutPromise]);

        if (result === null) { // Tempo limite ocorreu
          console.error("AuthContext: Falha ao carregar sessão inicial devido a tempo limite. Forçando limpeza de sessão.");
          showError("Erro ao carregar sessão. Limpando dados e tentando novamente.");
          await supabase.auth.signOut(); // Isso deve limpar o armazenamento local do Supabase
          setCurrentUser(null);
          setProfile(null);
        } else { // A promessa da sessão resolveu (com dados ou erro)
          const { data: { session }, error: getSessionError } = result as { data: { session: Session | null }, error: Error | null };

          console.log("AuthContext: supabase.auth.getSession() concluído. Session:", session, "Error:", getSessionError);

          if (getSessionError) {
            console.error("AuthContext: Erro ao obter sessão inicial:", getSessionError);
            showError("Erro ao carregar sessão. Por favor, faça login novamente.");
            await supabase.auth.signOut();
            setCurrentUser(null);
            setProfile(null);
          } else if (session?.user) {
            setCurrentUser(session.user);
            const userProfile = await fetchOrCreateProfile(session.user);
            if (userProfile) {
              setProfile(userProfile);
            } else {
              console.error("AuthContext: Falha ao carregar/criar perfil após getSession(). Forçando logout.");
              showError('Não foi possível carregar os dados do perfil. Por favor, faça login novamente.');
              await supabase.auth.signOut();
              setCurrentUser(null);
              setProfile(null);
            }
          } else {
            setCurrentUser(null);
            setProfile(null);
          }
        }
      } catch (e) {
        console.error("AuthContext: Erro inesperado durante loadInitialSession:", e);
        showError("Erro inesperado ao carregar sessão inicial. Por favor, tente novamente.");
        setCurrentUser(null);
        setProfile(null);
        await supabase.auth.signOut();
      } finally {
        setLoading(false);
        console.log("AuthContext: loadInitialSession finalizado, loading set to false.");
      }
    };

    loadInitialSession(); // Chama a função para carregar a sessão inicial

    // O onAuthStateChange ainda é necessário para reagir a mudanças de estado após o carregamento inicial
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("AuthContext: onAuthStateChange event:", _event, "session:", session?.user?.id);
      
      // Se o evento for INITIAL_SESSION, já lidamos com ele acima, então podemos ignorar aqui
      if (_event === 'INITIAL_SESSION') {
        console.log("AuthContext: onAuthStateChange ignorando INITIAL_SESSION, já tratado por getSession().");
        return;
      }

      try {
        if (session?.user) {
          setCurrentUser(session.user);
          const userProfile = await fetchOrCreateProfile(session.user);
          if (userProfile) {
            setProfile(userProfile);
          } else {
            console.error("AuthContext: Falha ao carregar/criar perfil após onAuthStateChange. Forçando logout.");
            showError('Não foi possível carregar os dados do perfil. Por favor, faça login novamente.');
            await supabase.auth.signOut();
            setCurrentUser(null);
            setProfile(null);
          }
        } else {
          setCurrentUser(null);
          setProfile(null);
        }
      } catch (e) {
        console.error("AuthContext: Erro inesperado no onAuthStateChange:", e);
        showError("Erro inesperado na autenticação. Por favor, tente novamente.");
        setCurrentUser(null);
        setProfile(null);
        await supabase.auth.signOut();
      } finally {
        // Não definimos setLoading(false) aqui, pois loadInitialSession já o faz para o estado inicial.
        // Para eventos subsequentes, o estado de loading pode ser gerenciado de forma diferente se necessário.
        console.log("AuthContext: onAuthStateChange process finished.");
      }
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
      // fetchOrCreateProfile será chamado pelo onAuthStateChange que será disparado após o login
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