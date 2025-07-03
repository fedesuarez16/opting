'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';

type UserRole = 'admin' | 'general_manager' | 'branch_manager';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        try {
          const userRef = ref(database, `users/${user.uid}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setUserRole(userData.role);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
      setIsLoading(false);
    };

    checkUserRole();
  }, [user]);

  useEffect(() => {
    if (!loading && !isLoading) {
      if (!user) {
        router.push('/login');
      } else if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
        router.push('/unauthorized');
      }
    }
  }, [user, loading, isLoading, userRole, allowedRoles, router]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user || (allowedRoles && userRole && !allowedRoles.includes(userRole))) {
    return null;
  }

  return <>{children}</>;
} 