'use client';

import { useState, useEffect, useMemo } from 'react';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useSucursales } from '@/hooks/useSucursales';
import Link from 'next/link';

interface ServicioData {
  nombre: string;
  sucursalesCount: number;
  sucursales: Array<{
    empresaId: string;
    empresaNombre: string;
    sucursalId: string;
    sucursalNombre: string;
  }>;
}

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Record<string, ServicioData>>({});
  const [loading, setLoading] = useState(true);
  const [selectedServicio, setSelectedServicio] = useState<string | null>(null);
  const { empresas } = useEmpresas();
  const { sucursales } = useSucursales(); // Obtener todas las sucursales

  useEffect(() => {
    const fetchServicios = async () => {
      setLoading(true);
      try {
        const medicionesQuery = collectionGroup(firestore, 'mediciones');
        const medicionesSnapshot = await getDocs(medicionesQuery);
        
        const serviciosMap: Record<string, {
          sucursales: Set<string>;
          sucursalesData: Map<string, { empresaId: string; empresaNombre: string; sucursalId: string; sucursalNombre: string }>;
        }> = {};
        
        medicionesSnapshot.forEach((doc) => {
          const datos = doc.data() as Record<string, unknown>;
          const getValue = (k: string) => String((datos[k] ?? '') as unknown);
          
          const servicio = getValue('SERVICIO') || getValue('servicio');
          const empresaId = getValue('CLIENTE');
          const sucursalId = getValue('SUCURSAL');
          
          if (servicio && servicio.trim() !== '' && empresaId && sucursalId) {
            const servicioKey = servicio.trim();
            
            if (!serviciosMap[servicioKey]) {
              serviciosMap[servicioKey] = {
                sucursales: new Set(),
                sucursalesData: new Map()
              };
            }
            
            // Crear clave única para la sucursal
            const sucursalKey = `${empresaId}_${sucursalId}`;
            
            // Solo agregar si no existe ya
            if (!serviciosMap[servicioKey].sucursales.has(sucursalKey)) {
              serviciosMap[servicioKey].sucursales.add(sucursalKey);
              
              // Obtener nombre de empresa
              const empresa = empresas.find(e => e.id === empresaId);
              const empresaNombre = empresa?.nombre || empresaId;
              
              // Obtener nombre de sucursal
              const sucursal = sucursales.find(s => s.id === sucursalId && s.empresaId === empresaId);
              const sucursalNombre = sucursal?.nombre || sucursalId;
              
              serviciosMap[servicioKey].sucursalesData.set(sucursalKey, {
                empresaId,
                empresaNombre,
                sucursalId,
                sucursalNombre
              });
            }
          }
        });
        
        // Convertir a formato final
        const serviciosData: Record<string, ServicioData> = {};
        Object.keys(serviciosMap).forEach(servicioNombre => {
          const data = serviciosMap[servicioNombre];
          serviciosData[servicioNombre] = {
            nombre: servicioNombre,
            sucursalesCount: data.sucursales.size,
            sucursales: Array.from(data.sucursalesData.values())
          };
        });
        
        // Ordenar alfabéticamente por nombre del servicio
        const sortedServicios = Object.keys(serviciosData).sort((a, b) => 
          a.localeCompare(b, 'es', { sensitivity: 'base' })
        );
        
        const orderedServicios: Record<string, ServicioData> = {};
        sortedServicios.forEach(key => {
          orderedServicios[key] = serviciosData[key];
        });
        
        setServicios(orderedServicios);
      } catch (error) {
        console.error('Error al obtener servicios:', error);
      } finally {
        setLoading(false);
      }
    };

    if (empresas.length > 0 && sucursales.length > 0) {
      fetchServicios();
    }
  }, [empresas, sucursales]);

  const handleServicioClick = (servicioNombre: string) => {
    setSelectedServicio(selectedServicio === servicioNombre ? null : servicioNombre);
  };

  if (loading) {
    return (
      <div className='p-8 bg-white min-h-full'>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-gray-200 rounded-2xl p-6 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 lg:p-8 bg-white'>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Servicios</h2>
        <p className="mt-1 text-sm text-gray-500">
          Listado de servicios y sucursales asociadas
        </p>
      </div>

      {Object.keys(servicios).length === 0 ? (
        <div className="bg-gray-100 rounded-2xl p-8 text-center">
          <p className="text-gray-500">No se encontraron servicios.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(servicios).map((servicio) => (
            <div key={servicio.nombre} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div 
                className="px-6 py-4 border-b border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleServicioClick(servicio.nombre)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                      <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{servicio.nombre}</h3>
                      <p className="text-sm text-gray-500">{servicio.sucursalesCount} sucursal{servicio.sucursalesCount !== 1 ? 'es' : ''}</p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    <svg 
                      className={`h-5 w-5 transition-transform ${selectedServicio === servicio.nombre ? 'rotate-180' : ''}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {selectedServicio === servicio.nombre && (
                <div className="p-6 bg-white">
                  {servicio.sucursales.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay sucursales para este servicio.</p>
                  ) : (
                    <div className="space-y-3">
                      {servicio.sucursales.map((sucursal, index) => (
                        <div
                          key={`${sucursal.empresaId}_${sucursal.sucursalId}_${index}`}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-medium text-gray-900 truncate">
                              {sucursal.sucursalNombre}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {sucursal.empresaNombre}
                            </p>
                          </div>
                          <Link
                            href={`/dashboard/empresas/${encodeURIComponent(sucursal.empresaId)}/sucursales/${encodeURIComponent(sucursal.sucursalId)}`}
                            className="ml-4 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex-shrink-0"
                          >
                            Ver detalle
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
