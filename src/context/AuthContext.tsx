import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  full_name: string;
  role: 'cliente' | 'admin';
  avatar_url: string;
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
    let { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') { // No rows found
      // Profile does not exist, create a basic one
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: user.id, full_name: user.email?.split('@')[0] || 'Usuário Novo', role: 'cliente' })
        .select()
        .single();

      if (insertError) {
        showError('Erro ao criar perfil básico: ' + insertError.message);
        return null;
      }
      showSuccess('Perfil criado automaticamente.');
      return newProfile;
    } else if (profileError) {
      showError('Erro ao carregar perfil: ' + profileError.message);
      return null;
    }
    return userProfile;
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
        const userProfile = await fetchOrCreateProfile(session.user);
        setProfile(userProfile);
      }
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        const userProfile = await fetchOrCreateProfile(session.user);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showError(error.message);
    } else if (data.user) {
      const userProfile = await fetchOrCreateProfile(data.user);

      if (userProfile) {
        setProfile(userProfile);
        setCurrentUser(data.user);
        showSuccess('Login realizado com sucesso!');
        navigate('/');
      } else {
        // If profile creation/fetch failed, log out the user
        showError('Não foi possível carregar ou criar os dados do perfil. Por favor, tente novamente.');
        await supabase.auth.signOut();
      }
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setCurrentUser(null);
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
      {!loading && children}
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