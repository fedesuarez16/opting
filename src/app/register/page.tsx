'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { ref, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useSucursales } from '@/hooks/useSucursales';
import Sidebar from '@/components/Sidebar';
import Breadcrumb from '@/components/Breadcrumb';

type UserRole = 'admin' | 'general_manager' | 'branch_manager';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('branch_manager');
  const [empresaId, setEmpresaId] = useState('');
  const [sucursalId, setSucursalId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();
  const { empresas } = useEmpresas();
  const { sucursales } = useSucursales(empresaId || undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (role === 'general_manager' && !empresaId) {
      return setError('Debe seleccionar una empresa para un gerente general');
    }

    if (role === 'branch_manager' && (!empresaId || !sucursalId)) {
      return setError('Debe seleccionar una empresa y una sucursal para un gerente de sucursal');
    }

    try {
      setError('');
      setLoading(true);
      const userCredential = await signUp(email, password);
      
      // Store additional user data in Firebase Realtime Database
      const userData: any = {
        email: email,
        role: role,
        createdAt: new Date().toISOString(),
      };

      // Si es gerente general, agregar empresaId
      if (role === 'general_manager') {
        userData.empresaId = empresaId;
        // También guardar el nombre de la empresa para fácil acceso
        const empresa = empresas.find(e => e.id === empresaId);
        if (empresa) {
          userData.empresaNombre = empresa.nombre;
        }
      }

      // Si es gerente de sucursal, agregar empresaId y sucursalId
      if (role === 'branch_manager') {
        userData.empresaId = empresaId;
        userData.sucursalId = sucursalId;
        // También guardar los nombres para fácil acceso
        const empresa = empresas.find(e => e.id === empresaId);
        if (empresa) {
          userData.empresaNombre = empresa.nombre;
        }
        const sucursal = sucursales.find(s => s.id === sucursalId);
        if (sucursal) {
          userData.sucursalNombre = sucursal.nombre;
        }
      }

      await set(ref(database, `users/${userCredential.user.uid}`), userData);

      router.push('/dashboard');
    } catch {
      setError('Failed to create an account');
    }
    setLoading(false);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex md:flex-shrink-0 transition-all duration-300 ${isDesktopSidebarCollapsed ? 'w-20' : 'w-52'}`}>
        <div className="flex flex-col w-full">
          <Sidebar 
            collapsed={isDesktopSidebarCollapsed}
            onToggle={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
          />
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className="fixed inset-0 flex z-40">
          <div
            className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ease-linear duration-300 ${
              isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          <div
            className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transform transition ease-in-out duration-300 ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <span className="text-white">✕</span>
              </button>
            </div>

            <Sidebar isMobile onCloseMobileMenu={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col bg-white flex-1 overflow-hidden">
        {/* Top bar */}
        <div className="w-full bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
              className="hidden md:flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label={isDesktopSidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12" />
              </svg>
            </button>

            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Abrir menú"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Breadcrumb */}
            <div className="ml-2 md:ml-0">
              <Breadcrumb />
            </div>
          </div>

          {/* Right side of top bar */}
          <div className="flex items-center space-x-4">
            {/* User menu could go here */}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="min-h-full flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
              <div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                  Registrar usuario
                </h2>
              </div>
              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="role"
              name="role"
              className="mt-1 block text-black w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
              value={role}
              onChange={(e) => {
                const newRole = e.target.value as UserRole;
                setRole(newRole);
                // Reset empresaId y sucursalId cuando se cambia el rol
                if (newRole === 'admin') {
                  setEmpresaId('');
                  setSucursalId('');
                } else if (newRole === 'general_manager') {
                  setSucursalId('');
                }
              }}
            >
              <option value="admin">Administrator</option>
              <option value="general_manager">General Manager</option>
              <option value="branch_manager">Branch Manager</option>
            </select>
          </div>

          {role === 'general_manager' && (
            <div>
              <label htmlFor="empresa-id" className="block text-sm font-medium text-gray-700">
                Empresa
              </label>
              <select
                id="empresa-id"
                name="empresa-id"
                required
                className="mt-1 block text-black w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
              >
                <option value="">Seleccione una empresa</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {role === 'branch_manager' && (
            <>
              <div>
                <label htmlFor="empresa-id-branch" className="block text-sm font-medium text-gray-700">
                  Empresa
                </label>
                <select
                  id="empresa-id-branch"
                  name="empresa-id-branch"
                  required
                  className="mt-1 block w-full text-black pl-3 pr-10 py-2 text-base border-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
                  value={empresaId}
                  onChange={(e) => {
                    setEmpresaId(e.target.value);
                    setSucursalId(''); // Reset sucursal cuando cambia la empresa
                  }}
                >
                  <option value="">Seleccione una empresa</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {empresaId && (
                <div>
                  <label htmlFor="sucursal-id" className="block text-sm  font-medium text-gray-700">
                    Sucursal
                  </label>
                  <select
                    id="sucursal-id"
                    name="sucursal-id"
                    required
                    className="mt-1 block text-black w-full pl-3 pr-10 py-2 text-base border-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
                    value={sucursalId}
                    onChange={(e) => setSucursalId(e.target.value)}
                    disabled={!empresaId || sucursales.length === 0}
                  >
                    <option value="">
                      {sucursales.length === 0 ? 'No hay sucursales disponibles' : 'Seleccione una sucursal'}
                    </option>
                    {sucursales.map((sucursal) => (
                      <option key={sucursal.id} value={sucursal.id}>
                        {sucursal.nombre} {sucursal.direccion ? `- ${sucursal.direccion}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
          
          <div className="text-sm text-center">
            <Link href="/login" className="font-medium text-gray-600 hover:text-gray-500">
              Already have an account? Sign in
            </Link>
          </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 