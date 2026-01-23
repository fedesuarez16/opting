'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Breadcrumb from '@/components/Breadcrumb';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

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

  return (
    <div className="min-h-screen md:h-screen flex flex-col md:flex-row md:overflow-hidden bg-gray-100">
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
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ease-linear duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          <div className="relative flex flex-col max-w-xs w-full h-full bg-white transform transition ease-in-out duration-300 translate-x-0">
            <div className="absolute top-0 right-0 -mr-12 pt-2 z-10">
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
      )}

      {/* Main content area */}
      <div className="flex flex-col flex-1 md:overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="w-full bg-white border-b border-gray-200 px-3 sm:px-4 py-3 flex items-center justify-between flex-shrink-0 min-w-0">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
              className="hidden md:flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label={isDesktopSidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12" />
              </svg>
            </button>

            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Abrir menú"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Breadcrumb */}
            <div className="ml-1 sm:ml-2 md:ml-0 min-w-0 flex-1">
              <Breadcrumb />
            </div>
          </div>

          {/* Right side of top bar - could include user menu, notifications, etc. */}
          <div className="flex items-center space-x-4">
            {/* You can add user menu, notifications, etc. here */}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 relative z-0 md:overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>

    
    </div>
  );
} 