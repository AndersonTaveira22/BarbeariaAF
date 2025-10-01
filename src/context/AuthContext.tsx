import React, { createContext, useContext, useState, ReactNode } from 'react';
import { users, User } from '@/data/mock';
import { useNavigate } from 'react-router-dom';
import { showError, showSuccess } from '@/utils/toast';

interface AuthContextType {
  currentUser: User | null;
  login: (email, password) => boolean;
  logout: () => void;
  register: (name, email, phone, password) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const login = (email, password) => {
    const user = users.find(
      (u) => u.email === email && u.password === password,
    );
    if (user) {
      setCurrentUser(user);
      showSuccess('Login realizado com sucesso!');
      return true;
    }
    showError('E-mail ou senha inválidos.');
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    navigate('/login');
  };
  
  const register = (name, email, phone, password) => {
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      showError("Este e-mail já está em uso.");
      return;
    }
    const newUser: User = {
      id: users.length + 1,
      name,
      email,
      password,
      role: 'cliente'
    };
    users.push(newUser); // In a real app, this would be an API call
    showSuccess("Cadastro realizado com sucesso! Faça o login.");
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, register }}>
      {children}
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