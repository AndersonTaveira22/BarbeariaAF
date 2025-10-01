import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from './ui/skeleton';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { profile, currentUser } = useAuth();

  // Still loading auth state
  if (currentUser === undefined) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="w-full h-24 mb-4" />
        <Skeleton className="w-full h-64" />
      </div>
    );
  }

  // Not logged in or not an admin
  if (!currentUser || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;