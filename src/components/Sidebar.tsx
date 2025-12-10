'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';

type UserRole = 'admin' | 'general_manager' | 'branch_manager';

interface SidebarProps {
  isMobile?: boolean;
  onCloseMobileMenu?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isMobile = false, onCloseMobileMenu, collapsed: externalCollapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  
  // Use external collapsed state if provided, otherwise use internal state
  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  // Fetch user role
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
      } else {
        setUserRole(null);
      }
    };

    checkUserRole();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const toggleSidebar = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  return (
    <div className={`flex flex-col ${isMobile ? 'h-full' : 'h-0 flex-1'} border-r border-gray-200/60 bg-white transition-all duration-300 ${collapsed ? 'w-20' : 'w-52'}`}>
      <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
        {/* Logo and toggle button */}
        <div className="relative px-5 mb-6">
          <div className="flex items-center justify-center w-full">
            <Image 
              src="/optinglogo 2.png" 
              alt="Opting Logo" 
              width={collapsed ? 40 : 100} 
              height={collapsed ? 40 : 42} 
              className="object-contain transition-opacity duration-200"
            />
          </div>
          {/* Only show toggle button on mobile or when external toggle is not provided */}
          {(isMobile || !onToggle) && (
            <button 
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-200"
            >
              <Image src="/Button.png" alt="Toggle sidebar" width={14} height={14} />
            </button>
          )}
        </div>

        {/* Divider between logo and navigation */}
        <div className="px-5 mb-4">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          <Link
            href="/dashboard/empresas"
            className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              pathname === '/dashboard/empresas' 
                ? 'bg-gray-800 text-white shadow-sm' 
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            } ${collapsed ? 'justify-center px-2' : ''}`}
            onClick={isMobile ? onCloseMobileMenu : undefined}
            title="Dashboard"
          >
            <span className={`${collapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
              pathname === '/dashboard/empresas' ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
            }`}>
              {/* Dashboard icon */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
              </svg>
            </span>
            {!collapsed && <span className="truncate">Dashboard</span>}
          </Link>

          <Link
            href="/dashboard/empresas"
            className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              pathname.startsWith('/dashboard/empresas') && pathname !== '/dashboard/empresas'
                ? 'bg-gray-900 text-white shadow-sm' 
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            } ${collapsed ? 'justify-center px-2' : ''}`}
            onClick={isMobile ? onCloseMobileMenu : undefined}
            title="Empresas"
          >
            <span className={`${collapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
              pathname.startsWith('/dashboard/empresas') && pathname !== '/dashboard/empresas' ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
            }`}>
              {/* Empresas icon */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </span>
            {!collapsed && <span className="truncate">Empresas</span>}
          </Link>

          <Link
            href="/dashboard/empresas"
            className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              pathname.startsWith('/dashboard/sucursales') 
                ? 'bg-gray-900 text-white shadow-sm' 
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            } ${collapsed ? 'justify-center px-2' : ''}`}
            onClick={isMobile ? onCloseMobileMenu : undefined}
            title="Sucursales"
          >
            <span className={`${collapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
              pathname.startsWith('/dashboard/sucursales') ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
            }`}>
              {/* Sucursales icon */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
              </svg>
            </span>
            {!collapsed && <span className="truncate">Sucursales</span>}
          </Link>

          {/* Registrar usuario - Solo visible para admin */}
          {userRole === 'admin' && (
            <>
              <div className="px-3 my-2">
                <div className="h-px bg-gray-200"></div>
              </div>
              <Link
                href="/register"
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  pathname === '/register' 
                    ? 'bg-gray-900 text-white shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                onClick={isMobile ? onCloseMobileMenu : undefined}
                title="Registrar usuario"
              >
                <span className={`${collapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                  pathname === '/register' ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                }`}>
                  {/* User plus icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                  </svg>
                </span>
                {!collapsed && <span className="truncate">Registrar usuario</span>}
              </Link>
            </>
          )}

          {/* Keep the rest of the links but hidden for now since they're not in the image */}
          <div className="hidden">
            <Link
              href="/dashboard/empresas"
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                pathname === '/dashboard/empresas' 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={isMobile ? onCloseMobileMenu : undefined}
            >
              <span className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500">📄</span>
              Documentos
            </Link>
            <Link
              href="/dashboard/reports"
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                pathname === '/dashboard/reports' 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={isMobile ? onCloseMobileMenu : undefined}
            >
              <span className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500">📈</span>
              Reportes
            </Link>
            <Link
              href="/dashboard/mediciones"
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                pathname === '/dashboard/mediciones' 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={isMobile ? onCloseMobileMenu : undefined}
            >
              <span className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500">📏</span>
              Mediciones
            </Link>
          </div>
        </nav>
      </div>
      <div className="flex-shrink-0 border-t border-gray-200/60 px-4 py-4">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex-1 min-w-0 mr-3">
              <div className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium text-gray-600 truncate`}>
                {user?.email?.split('@')[0] || 'Usuario'}
              </div>
              <div className={`${isMobile ? 'text-xs' : 'text-[10px]'} text-gray-400 truncate mt-0.5`}>
                {user?.email}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex-shrink-0 p-2 text-gray-400 rounded-lg hover:bg-gray-50 hover:text-gray-600 transition-all duration-200 ${
              collapsed ? 'w-full' : ''
            }`}
            title="Cerrar sesión"
          >
            <span className="sr-only">Logout</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
} 