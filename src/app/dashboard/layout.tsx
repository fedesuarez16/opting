'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <span className="text-xl font-bold">Opting</span>
              </div>
              <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
                <Link
                  href="/dashboard"
                  className="group flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                >
                  <span className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500">📊</span>
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/documents"
                  className="group flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                >
                  <span className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500">📄</span>
                  Documentos
                </Link>
                <Link
                  href="/dashboard/empresas"
                  className="group flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                >
                  <span className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500">🏢</span>
                  Empresas
                </Link>
                <Link
                  href="/dashboard/sucursales"
                  className="group flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                >
                  <span className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500">🏪</span>
                  Sucursales
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="group flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                >
                  <span className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500">📈</span>
                  Reportes
                </Link>
                <Link
                  href="/dashboard/mediciones"
                  className="group flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                >
                  <span className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500">📏</span>
                  Mediciones
                </Link>
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div>
                  <div className="text-sm font-medium text-gray-700">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-auto flex-shrink-0 bg-white p-1 text-gray-400 rounded-full hover:text-gray-500"
                >
                  <span className="sr-only">Logout</span>
                  <span>🚪</span>
                </button>
              </div>
            </div>
          </div>
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

            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <span className="text-xl font-bold">Opting</span>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                <Link
                  href="/dashboard"
                  className="group flex items-center px-2 py-2 text-base font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500">📊</span>
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/documents"
                  className="group flex items-center px-2 py-2 text-base font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500">📄</span>
                  Documentos
                </Link>
                <Link
                  href="/dashboard/empresas"
                  className="group flex items-center px-2 py-2 text-base font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500">🏢</span>
                  Empresas
                </Link>
                <Link
                  href="/dashboard/sucursales"
                  className="group flex items-center px-2 py-2 text-base font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500">🏪</span>
                  Sucursales
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="group flex items-center px-2 py-2 text-base font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500">📈</span>
                  Reportes
                </Link>
                <Link
                  href="/dashboard/mediciones"
                  className="group flex items-center px-2 py-2 text-base font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500">📏</span>
                  Mediciones
                </Link>
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div>
                  <div className="text-base font-medium text-gray-700">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-auto bg-white flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Logout</span>
                  <span>🚪</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <span className="text-xl">☰</span>
          </button>
        </div>

        {/* Main content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
} 