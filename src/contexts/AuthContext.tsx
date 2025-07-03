'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  UserCredential
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => ({} as UserCredential),
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('AuthProvider: Auth state changed', user ? 'User logged in' : 'No user');
      setUser(user);
      setLoading(false);
    });

    return () => {
      console.log('AuthProvider: Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('AuthProvider: Attempting to sign in user:', email);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('AuthProvider: Sign in successful');
    } catch (error) {
      console.error('AuthProvider: Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    console.log('AuthProvider: Attempting to sign up user:', email);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('AuthProvider: Sign up successful');
      return result;
    } catch (error) {
      console.error('AuthProvider: Sign up error:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('AuthProvider: Attempting to logout');
    try {
      await signOut(auth);
      console.log('AuthProvider: Logout successful');
    } catch (error) {
      console.error('AuthProvider: Logout error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    logout,
  };

  console.log('AuthProvider: Current state', { user: !!user, loading });

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 