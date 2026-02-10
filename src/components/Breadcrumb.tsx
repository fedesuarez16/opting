'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useMemo, useState, useEffect } from 'react';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';

interface BreadcrumbProps {
  customLabels?: Record<string, string>;
}

type UserRole = 'admin' | 'general_manager' | 'branch_manager';

export default function Breadcrumb({ customLabels = {} }: BreadcrumbProps) {
  const pathname = usePathname();
  const { empresas } = useEmpresas();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  
  // Obtener el rol del usuario
  useEffect(() => {
    const fetchUserRole = async () => {
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
    };

    fetchUserRole();
  }, [user]);
  
  // Skip the first empty segment after splitting - memoize to prevent unnecessary re-renders
  // Decode URL-encoded characters (like %20 for spaces) for better visual display
  const segments = useMemo(() => {
    return pathname.split('/').filter(Boolean).map(segment => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  }, [pathname]);
  
  // Custom mapping for segment labels
  const defaultLabels: Record<string, string> = {
    'dashboard': 'Dashboard',
    'empresas': 'Empresas',
    'sucursales': 'Sucursales',
    'mediciones': 'Mediciones',
    'reports': 'Reportes',
    'documents': 'Documentos',
    'empresagte': 'Mi Empresa',
    'register': 'Registrar usuario',
  };

  // Auto-resolve dynamic labels based on URL structure - use useMemo instead of useEffect to avoid infinite loops
  const dynamicLabels = useMemo(() => {
    const newDynamicLabels: Record<string, string> = {};
    
    segments.forEach((segment, index) => {
      // If we're at empresas/[id]/sucursales, try to resolve the empresa ID
      if (segments[index - 1] === 'empresas' && segments[index + 1] === 'sucursales') {
        const empresa = empresas.find(e => e.id === segment);
        if (empresa) {
          newDynamicLabels[segment] = empresa.nombre;
        }
      }
    });

    return newDynamicLabels;
  }, [segments, empresas]);
  
  // Merge default labels with custom labels and dynamic labels
  const labels = useMemo(() => ({ 
    ...defaultLabels, 
    ...dynamicLabels, 
    ...customLabels 
  }), [dynamicLabels, customLabels]);

  return (
    <nav className="flex min-w-0 flex-1" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1 overflow-hidden">
        <li className="flex-shrink-0">
          <Link 
            href="/dashboard" 
            className="text-gray-500 hover:text-gray-700 flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </Link>
        </li>
        
        {segments.map((segment, index) => {
          // Skip 'dashboard' in the breadcrumb path since we already have the home icon
          if (segment === 'dashboard' && index === 0) return null;
          
          // Build the href up to this point
          let href = `/${segments.slice(0, index + 1).join('/')}`;
          
          // Special case: if user is general_manager and clicking on "sucursales" from any route, redirect to /empresagte
          // This handles the case where general_manager is on /dashboard/empresas/[id]/sucursales/[sucursalId] or similar routes
          if (segment === 'sucursales' && userRole === 'general_manager') {
            href = '/empresagte';
          }
          
          // Special case: if we're on /empresagte and clicking on "sucursales", redirect to /empresagte
          // This handles the case where "sucursales" appears in the breadcrumb for general_manager
          // Check if pathname includes empresasgte OR if the first segment is empresasgte
          const isOnEmpresagte = pathname.includes('/empresagte') || segments[0] === 'empresagte' || pathname.startsWith('/empresagte');
          
          // If we're on empresasgte and clicking on "sucursales", always redirect to /empresagte
          // This prevents redirecting to incorrect routes like /dashboard/empresas/[id]/sucursales
          if (segment === 'sucursales' && isOnEmpresagte) {
            href = '/empresagte';
          }
          
          // Additional check: if we're building a path that includes "empresas" and "sucursales" but the current pathname is empresasgte, redirect to empresasgte
          // This catches cases where the href being built would be something like /dashboard/empresas/[id]/sucursales when we're actually on empresasgte
          if (segment === 'sucursales' && (href.includes('/empresas/') || href.includes('/dashboard/empresas/')) && isOnEmpresagte) {
            href = '/empresagte';
          }
          
          // Final check: if the href contains "empresas" and "sucursales" but we're on empresasgte, redirect to empresasgte
          // This is a catch-all to ensure we never redirect to the wrong route
          if (segment === 'sucursales' && href.includes('empresas') && isOnEmpresagte) {
            href = '/empresagte';
          }
          
          // Check if this is a dynamic segment (starts with '[' and ends with ']')
          const isDynamicSegment = segment.startsWith('[') && segment.endsWith(']');
          
          // Check if this looks like a dynamic ID (UUID or long string that's not a known route)
          const looksLikeId = segment.length > 10 && !labels[segment];
          
          // If it's the last segment, don't make it a link
          const isLastSegment = index === segments.length - 1;
          
          // Get the display label for this segment
          let displayLabel = segment;
          
          // If it's a dynamic segment, remove the brackets and use the custom label if provided
          if (isDynamicSegment) {
            const paramName = segment.slice(1, -1); // Remove the brackets
            displayLabel = labels[paramName] || customLabels[paramName] || paramName;
          } else {
            displayLabel = labels[segment] || segment;
          }
          
          // Decode any remaining URL-encoded characters (like %20) for visual display
          try {
            displayLabel = decodeURIComponent(displayLabel);
          } catch {
            // If decoding fails, use the original label
          }
          
          return (
            <Fragment key={segment}>
              <li className="flex items-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </li>
              <li className="min-w-0">
                {isLastSegment ? (
                  <span className="text-gray-700 font-medium text-xs sm:text-sm truncate block">{displayLabel}</span>
                ) : (
                  <Link 
                    href={href} 
                    className="text-black hover:text-gray-800 text-xs sm:text-sm truncate block"
                  >
                    {displayLabel}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
} 