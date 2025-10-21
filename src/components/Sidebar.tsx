'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

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
  
  // Use external collapsed state if provided, otherwise use internal state
  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

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
    <div className={`flex flex-col ${isMobile ? 'h-full' : 'h-0 flex-1'} border-r border-gray-200 bg-white transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex-1 flex px-4 flex-col pt-5 pb-4 overflow-y-auto">
        {/* Logo and toggle button */}
        <div className="relative px-4 mb-6">
          <div className="flex items-center justify-center w-full">
            <Image 
              src="/optinglogo 2.png" 
              alt="Opting Logo" 
              width={collapsed ? 40 : 120} 
              height={collapsed ? 40 : 50} 
              className="object-contain"
            />
          </div>
          {/* Only show toggle button on mobile or when external toggle is not provided */}
          {(isMobile || !onToggle) && (
            <button 
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
            >
              <Image src="/Button.png" alt="Toggle sidebar" width={16} height={16} />
            </button>
          )}
        </div>

        {/* Navigation */}
        {!collapsed && <div className="px-4 text-sm text-gray-500"></div>}
        <nav className="mt-2 flex-1 px-2 bg-white space-y-1">
          <Link
            href="/dashboard/empresas"
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              pathname === '/dashboard/empresas' 
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } ${collapsed ? 'justify-center' : ''}`}
            onClick={isMobile ? onCloseMobileMenu : undefined}
            title="Dashboard"
          >
            <span className={`${collapsed ? '' : 'mr-3'} h-6 w-6 ${
              pathname === '/dashboard/empresas' ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {/* Dashboard icon */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
              </svg>
            </span>
            {!collapsed && "Dashboard"}
          </Link>

          <Link
            href="/dashboard/empresas"
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              pathname.startsWith('/dashboard/empresas') 
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } ${collapsed ? 'justify-center' : ''}`}
            onClick={isMobile ? onCloseMobileMenu : undefined}
            title="Empresas"
          >
            <span className={`${collapsed ? '' : 'mr-3'} h-6 w-6 ${
              pathname.startsWith('/dashboard/empresas') ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {/* Empresas icon */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </span>
            {!collapsed && "Empresas"}
          </Link>

          <Link
            href="/dashboard/empresas"
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              pathname.startsWith('/dashboard/sucursales') 
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } ${collapsed ? 'justify-center' : ''}`}
            onClick={isMobile ? onCloseMobileMenu : undefined}
            title="Sucursales"
          >
            <span className={`${collapsed ? '' : 'mr-3'} h-6 w-6 ${
              pathname.startsWith('/dashboard/empresas') ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {/* Sucursales icon */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
              </svg>
            </span>
            {!collapsed && "Sucursales"}
          </Link>

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
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
          {!collapsed && (
            <div className="truncate max-w-[130px]">
              <div className={`${isMobile ? 'text-base' : 'text-sm'} font-medium text-gray-700 truncate`}>
                {user?.email}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`${collapsed ? '' : 'ml-auto'} flex-shrink-0 bg-white p-1 text-gray-400 rounded-full hover:text-gray-500`}
            title="Cerrar sesión"
          >
            <span className="sr-only">Logout</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
} 