'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

interface ClientSidebarProps {
  isMobile?: boolean;
  onCloseMobileMenu?: () => void;
}

export default function ClientSidebar({ isMobile = false, onCloseMobileMenu }: ClientSidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={`flex flex-col ${isMobile ? 'h-full' : 'h-0 flex-1'} border-r border-gray-200 bg-white transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
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
          <button 
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
          >
            <Image src="/Button.png" alt="Toggle sidebar" width={16} height={16} />
          </button>
        </div>

        {/* Navigation */}
        {!collapsed && <div className="px-4 text-sm text-gray-500">Panel Cliente</div>}
        <nav className="mt-2 flex-1 px-2 bg-white space-y-1">
          <Link
            href="/clientes"
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              pathname === '/clientes' 
                ? 'bg-blue-100 text-blue-900' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } ${collapsed ? 'justify-center' : ''}`}
            onClick={isMobile ? onCloseMobileMenu : undefined}
            title="Dashboard"
          >
            <span className={`${collapsed ? '' : 'mr-3'} h-6 w-6 ${
              pathname === '/clientes' ? 'text-blue-900' : 'text-gray-400'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
              </svg>
            </span>
            {!collapsed && "Dashboard"}
          </Link>

          <Link
            href="/clientes/mis-mediciones"
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              pathname.startsWith('/clientes/mis-mediciones') 
                ? 'bg-blue-100 text-blue-900' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } ${collapsed ? 'justify-center' : ''}`}
            onClick={isMobile ? onCloseMobileMenu : undefined}
            title="Mis Mediciones"
          >
            <span className={`${collapsed ? '' : 'mr-3'} h-6 w-6 ${
              pathname.startsWith('/clientes/mis-mediciones') ? 'text-blue-900' : 'text-gray-400'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </span>
            {!collapsed && "Mis Mediciones"}
          </Link>

          <Link
            href="/clientes/documentos"
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              pathname.startsWith('/clientes/documentos') 
                ? 'bg-blue-100 text-blue-900' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } ${collapsed ? 'justify-center' : ''}`}
            onClick={isMobile ? onCloseMobileMenu : undefined}
            title="Documentos"
          >
            <span className={`${collapsed ? '' : 'mr-3'} h-6 w-6 ${
              pathname.startsWith('/clientes/documentos') ? 'text-blue-900' : 'text-gray-400'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </span>
            {!collapsed && "Documentos"}
          </Link>
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
