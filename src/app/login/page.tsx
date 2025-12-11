'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import Link from 'next/link';
import Image from 'next/image';

type UserRole = 'admin' | 'general_manager' | 'branch_manager';

interface UserData {
  role: UserRole;
  empresaId?: string;
  sucursalId?: string;
  email: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Handle redirection after successful login
  useEffect(() => {
    const redirectUser = async () => {
      // Only redirect if user is logged in, auth is not loading, and we haven't redirected yet
      if (user && !authLoading && !hasRedirected) {
        try {
          setHasRedirected(true);
          const userRef = ref(database, `users/${user.uid}`);
          const userSnapshot = await get(userRef);
          
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val() as UserData;
            
            // Redirigir gerente general a su página específica
            if (userData.role === 'general_manager') {
              router.push('/empresagte');
              return;
            }
            
            // Redirigir gerente de sucursal a su página de sucursal específica
            if (userData.role === 'branch_manager' && userData.empresaId && userData.sucursalId) {
              router.push(`/dashboard/empresas/${encodeURIComponent(userData.empresaId)}/sucursales/${encodeURIComponent(userData.sucursalId)}`);
              return;
            }
          }
          
          // Default redirect for admin or if role couldn't be determined
          router.push('/dashboard/empresas');
        } catch (err) {
          console.error('Error fetching user data:', err);
          // Default redirect on error
          router.push('/dashboard/empresas');
        }
      }
    };

    redirectUser();
  }, [user, authLoading, hasRedirected, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      setHasRedirected(false); // Reset redirect flag on new login attempt
      await signInWithEmailAndPassword(auth, email, password);
      // Wait for auth state to update
      setLoading(false);
      // The useEffect will handle the redirection once user state updates
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      setLoading(false);
      setHasRedirected(false);
    }
  };

  // Don't show login form if user is already logged in (waiting for redirect)
  if (user && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Logo in top left corner */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 lg:left-12 xl:left-16 z-10">
        <Image 
          src="/optinglogo 2.png" 
          alt="OPTING Logo" 
          width={100} 
          height={40} 
          className="object-contain"
        />
      </div>

      {/* Left Panel - Login Form */}
      <div className="flex-1 bg-white flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto">

          {/* Title */}
          <h2 className="text-3xl font-bold text-black mb-4">
            Inicia sesion
          </h2>

          {/* Registration prompt */}
          <p className="text-sm text-gray-600 mb-8">
            Si no tienes cuenta Puedes <Link href="/register" className="font-bold text-gray-900 hover:underline">Register here!</Link>
          </p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 border-0 border-b-2 border-gray-600 focus:outline-none focus:ring-0 focus:border-gray-600 text-gray-900 placeholder-gray-400"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-10 py-3 border-0 border-b-2 border-gray-600 focus:outline-none focus:ring-0 focus:border-gray-600 text-gray-900 placeholder-gray-400"
                  placeholder="Enter your Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me and Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Rememebr me
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-gray-600 hover:text-gray-500">
                  Forgot Password?
                </a>
              </div>
            </div>

            {/* Login Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in...' : 'Login'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Panel - Welcome Message */}
      <div className="hidden lg:flex lg:flex-1 bg-gray-800 flex-col justify-between relative">
       

        {/* Welcome message */}
        <div className="px-12 m-20 pb-12">
          <h3 className="text-orange-500 text-2xl font-semibold mb-3">
            Bienvenido a Opting
          </h3>
          <p className="text-white text-base">
            Lorem Ipsum is simply
          </p>
        </div>
      </div>
    </div>
  );
} 