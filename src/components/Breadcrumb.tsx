'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

interface BreadcrumbProps {
  customLabels?: Record<string, string>;
}

export default function Breadcrumb({ customLabels = {} }: BreadcrumbProps) {
  const pathname = usePathname();
  
  // Skip the first empty segment after splitting
  const segments = pathname.split('/').filter(Boolean);
  
  // Custom mapping for segment labels
  const defaultLabels: Record<string, string> = {
    'dashboard': 'Dashboard',
    'empresas': 'Empresas',
    'sucursales': 'Sucursales',
    'mediciones': 'Mediciones',
    'reports': 'Reportes',
    'documents': 'Documentos',
  };
  
  // Merge default labels with custom labels
  const labels = { ...defaultLabels, ...customLabels };

  return (
    <nav className="flex mb-4 p-4 bg-white shadow-sm rounded-md" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link 
            href="/dashboard" 
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </Link>
        </li>
        
        {segments.map((segment, index) => {
          // Skip 'dashboard' in the breadcrumb path since we already have the home icon
          if (segment === 'dashboard' && index === 0) return null;
          
          // Build the href up to this point
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          
          // Check if this is a dynamic segment (starts with '[' and ends with ']')
          const isDynamicSegment = segment.startsWith('[') && segment.endsWith(']');
          
          // If it's the last segment or a dynamic segment, don't make it a link
          const isLastSegment = index === segments.length - 1;
          
          // Get the display label for this segment
          let displayLabel = segment;
          
          // If it's a dynamic segment, remove the brackets and use the custom label if provided
          if (isDynamicSegment) {
            const paramName = segment.slice(1, -1); // Remove the brackets
            displayLabel = customLabels[paramName] || paramName;
          } else {
            displayLabel = labels[segment] || segment;
          }
          
          return (
            <Fragment key={segment}>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </li>
              <li>
                {isLastSegment || isDynamicSegment ? (
                  <span className="text-gray-700 font-medium">{displayLabel}</span>
                ) : (
                  <Link 
                    href={href} 
                    className="text-indigo-600 hover:text-gray-800"
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