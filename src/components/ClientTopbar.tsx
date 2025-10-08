'use client';

import { useAuth } from '@/contexts/AuthContext';

interface ClientTopbarProps {
  onOpenMobileMenu: () => void;
}

export default function ClientTopbar({ onOpenMobileMenu }: ClientTopbarProps) {
  const { user } = useAuth();

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow border-b border-gray-200">
      {/* Mobile menu button */}
      <button
        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
        onClick={onOpenMobileMenu}
      >
        <span className="sr-only">Open sidebar</span>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>

      {/* Topbar content */}
      <div className="flex-1 px-4 flex justify-between items-center">
        <div className="flex-1 flex">
          {/* Search bar */}
          <div className="w-full flex md:ml-0">
            <label htmlFor="search-field" className="sr-only">
              Buscar
            </label>
            <div className="relative w-full text-gray-400 focus-within:text-gray-600">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search-field"
                className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
                placeholder="Buscar mediciones, documentos..."
                type="search"
              />
            </div>
          </div>
        </div>

        {/* Profile dropdown */}
        <div className="ml-4 flex items-center md:ml-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-700">
                {user?.email || 'Usuario'}
              </div>
              <div className="text-xs text-gray-500">Cliente</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
