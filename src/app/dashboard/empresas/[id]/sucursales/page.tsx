'use client';

import { useState, use, useEffect, useMemo } from 'react';
import { useSucursales, Sucursal } from '@/hooks/useSucursales';
import { useEmpresas } from '@/hooks/useEmpresas';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';
import { useMediciones } from '@/hooks/useMediciones';

interface SucursalesPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SucursalesPage({ params }: SucursalesPageProps) {
  const resolvedParams = use(params);
  const empresaId = decodeURIComponent(resolvedParams.id);
  const { sucursales, loading, error, addSucursal, updateSucursal, deleteSucursal } = useSucursales(empresaId);
  const { empresas } = useEmpresas();
  const { mediciones, loading: loadingMediciones } = useMediciones(empresaId);
  const empresa = empresas.find(e => e.id === empresaId);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  
  // Debug
  console.log('SucursalesPage - EmpresaId (decoded):', empresaId);
  console.log('SucursalesPage - EmpresaId (original):', resolvedParams.id);
  console.log('SucursalesPage - Todas las empresas disponibles:', empresas.map(e => ({ id: e.id, nombre: e.nombre })));
  console.log('SucursalesPage - Sucursales:', sucursales);
  console.log('SucursalesPage - Loading sucursales:', loading);
  console.log('SucursalesPage - Error:', error);
  console.log('SucursalesPage - Empresa encontrada:', empresa);
  
  const [showModal, setShowModal] = useState(false);
  const [currentSucursal, setCurrentSucursal] = useState<Sucursal | null>(null);
  const [search, setSearch] = useState('');

  // Mediciones "en nube" por sucursal
  const medicionesEnNubePorSucursal = useMemo(() => {
    const map: Record<string, any[]> = {};
    mediciones
      .filter(m => {
        // Buscar en diferentes campos posibles donde puede estar el estado "en nube"
        const datos = m.datos;
        
        // Revisar si algún campo contiene "nube" o "cloud"
        const enNube = Object.values(datos).some(value => {
          if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            return lowerValue.includes('nube') || lowerValue.includes('cloud');
          }
          if (typeof value === 'boolean') {
            return value && (
              datos.enNube || datos.EN_NUBE || datos.en_nube || datos.nube || 
              datos.cloud || datos.CLOUD
            );
          }
          return false;
        }) || datos.enNube || datos.EN_NUBE || datos.en_nube || datos.nube || datos.cloud || datos.CLOUD;
        
        return enNube;
      })
      .forEach(m => {
        if (!map[m.sucursalId]) map[m.sucursalId] = [];
        map[m.sucursalId].push(m);
      });
    
    console.log('Mediciones en nube por sucursal:', map);
    return map;
  }, [mediciones]);

  // Totales de mediciones "EN NUBE" para toda la empresa
  const totalesMedicionesEmpresa = useMemo(() => {
    let puestaTierra = 0;
    let iluminacion = 0;
    let ruido = 0;
    
    mediciones.forEach((m) => {
      const datos = m.datos as Record<string, unknown>;
      const getValue = (k: string) => String((datos[k] ?? '') as any);
      
      if (getValue('PUESTA A TIERRA') === 'EN NUBE') puestaTierra += 1;
      if (getValue('ILUMINACIÓN') === 'EN NUBE') iluminacion += 1;
      if (getValue('RUIDO') === 'EN NUBE') ruido += 1;
    });
    
    return { puestaTierra, iluminacion, ruido };
  }, [mediciones]);

  // Totales de incumplimientos que "CUMPLE" para toda la empresa
  const totalesIncumplimientosEmpresa = useMemo(() => {
    let incumplimientoPAT = 0;
    let incumplimientoILU = 0;
    let incumplimientoRUIDO = 0;
    
    mediciones.forEach((m) => {
      const datos = m.datos as Record<string, unknown>;
      const getValue = (k: string) => String((datos[k] ?? '') as any);
      
      if (getValue('INCUMPLIMIENTO PAT') === 'CUMPLE') incumplimientoPAT += 1;
      if (getValue('INCUMPLIMIENTO ILU') === 'CUMPLE') incumplimientoILU += 1;
      if (getValue('INCUMPLIMIENTO RUIDO') === 'CUMPLE') incumplimientoRUIDO += 1;
    });
    
    return { incumplimientoPAT, incumplimientoILU, incumplimientoRUIDO };
  }, [mediciones]);

  // Totales agregados para cards (valores de mediciones)
  const medicionesTotals = useMemo(() => {
    let puesta = 0;
    let informe = 0;
    let incumpl = 0;
    let extintores = 0;
    mediciones.forEach((m) => {
      const datos = m.datos as Record<string, unknown>;
      const up = (k: string) => String((datos[k] ?? '') as any).toUpperCase();
      if (up('PUESTA A TIERRA') === 'EN NUBE') puesta += 1;
      if (up('INFORME DE VISITA') === 'EN NUBE') informe += 1;
      if (up('INCUMPLIMIENTO') === 'PENDIENTE') incumpl += 1;
      if (up('REGISTRO DE EXTINTORES') === 'EN NUBE') extintores += 1;
    });
    return { puesta, informe, incumpl, extintores };
  }, [mediciones]);

  // Update custom labels when empresa is loaded
  useEffect(() => {
    if (empresa) {
      setCustomLabels({
        'id': empresa.nombre || 'Empresa',
      });
    }
  }, [empresa]);

  const filteredSucursales = sucursales.filter(sucursal => 
    sucursal.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (sucursal.direccion && sucursal.direccion.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddEdit = (sucursal: Sucursal | null) => {
    setCurrentSucursal(sucursal);
    setShowModal(true);
  };

  const handleDelete = (sucursalId: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta sucursal?')) {
      deleteSucursal(empresaId, sucursalId).catch(error => {
        console.error('Error al eliminar sucursal:', error);
        alert('Error al eliminar la sucursal');
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className='p-8 bg-white' >
      {/* Custom breadcrumb at the top */}
      <Breadcrumb customLabels={customLabels} />
      
      <div className='mb-4'>
          <div className="flex items-center">
            <Link href="/dashboard/empresas" className="mr-2 text-gray-600 hover:text-gray-900">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h3 className="text-2xl font-semibold text-gray-900">
              Sucursales de {empresa?.nombre || 'Empresa'}
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Gestione las sucursales de esta empresa
          </p>
        </div>

         {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      

      <div className="bg-gradient-to-b from-black to-gray-700 rounded-3xl p-6 text-white border border-gray-800 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-300 text-sm">Total sucursales</p>
           
            <p className="text-green-400 text-sm">-0.03%</p>
          </div>
          <div className="text-gray-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-b from-black to-gray-700  rounded-3xl p-6 text-white border border-gray-800 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-300 text-sm">Incumplimiento gral</p>
            <p className="text-3xl font-bold text-orange-400">32%</p>
            <p className="text-red-400 text-sm">-0.03%</p>
          </div>
          <div className="text-gray-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-b from-black to-gray-700  rounded-3xl p-6 text-white border border-gray-800 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-300 text-sm">Empresas que incumplen</p>
            <p className="text-3xl font-bold"></p>
            <p className="text-red-400 text-sm">-0.03%</p>
          </div>
          <div className="text-gray-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-b from-black to-gray-700  rounded-3xl p-6 text-white border border-gray-800 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-300 text-sm">Sucursales que incumplen</p>
           
            <p className="text-green-400 text-sm">+6.08%</p>
          </div>
          <div className="text-gray-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>
    </div>

      
      {/* Gráficos lado a lado */}
      <div className="bg-white mb-6 rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-900">Análisis de Mediciones - {empresa?.nombre || 'Empresa'}</h4>
          <span className="text-xs text-gray-400">Totales</span>
        </div>
        
        {loadingMediciones ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-48 bg-gray-100 rounded" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico 1: Mediciones EN NUBE */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-4 text-center">Mediciones EN NUBE</h5>
              <div className="flex items-end justify-center gap-4 h-48">
                <div className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">{totalesMedicionesEmpresa.puestaTierra}</div>
                  <div className="w-12 h-36 bg-gray-100 rounded relative overflow-hidden">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-green-500 rounded" 
                      style={{ height: `${totalesMedicionesEmpresa.puestaTierra > 0 ? Math.max(10, (totalesMedicionesEmpresa.puestaTierra / Math.max(totalesMedicionesEmpresa.puestaTierra, totalesMedicionesEmpresa.iluminacion, totalesMedicionesEmpresa.ruido, 1)) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 text-center">Puesta a Tierra</div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">{totalesMedicionesEmpresa.iluminacion}</div>
                  <div className="w-12 h-36 bg-gray-100 rounded relative overflow-hidden">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-yellow-500 rounded" 
                      style={{ height: `${totalesMedicionesEmpresa.iluminacion > 0 ? Math.max(10, (totalesMedicionesEmpresa.iluminacion / Math.max(totalesMedicionesEmpresa.puestaTierra, totalesMedicionesEmpresa.iluminacion, totalesMedicionesEmpresa.ruido, 1)) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 text-center">Iluminación</div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">{totalesMedicionesEmpresa.ruido}</div>
                  <div className="w-12 h-36 bg-gray-100 rounded relative overflow-hidden">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-red-500 rounded" 
                      style={{ height: `${totalesMedicionesEmpresa.ruido > 0 ? Math.max(10, (totalesMedicionesEmpresa.ruido / Math.max(totalesMedicionesEmpresa.puestaTierra, totalesMedicionesEmpresa.iluminacion, totalesMedicionesEmpresa.ruido, 1)) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 text-center">Ruido</div>
                </div>
              </div>
            </div>

            {/* Gráfico 2: Incumplimientos que CUMPLE */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-4 text-center">Incumplimientos CUMPLE</h5>
              <div className="flex items-end justify-center gap-4 h-48">
                <div className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">{totalesIncumplimientosEmpresa.incumplimientoPAT}</div>
                  <div className="w-12 h-36 bg-gray-100 rounded relative overflow-hidden">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-green-500 rounded" 
                      style={{ height: `${totalesIncumplimientosEmpresa.incumplimientoPAT > 0 ? Math.max(10, (totalesIncumplimientosEmpresa.incumplimientoPAT / Math.max(totalesIncumplimientosEmpresa.incumplimientoPAT, totalesIncumplimientosEmpresa.incumplimientoILU, totalesIncumplimientosEmpresa.incumplimientoRUIDO, 1)) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 text-center">PAT</div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">{totalesIncumplimientosEmpresa.incumplimientoILU}</div>
                  <div className="w-12 h-36 bg-gray-100 rounded relative overflow-hidden">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-yellow-500 rounded" 
                      style={{ height: `${totalesIncumplimientosEmpresa.incumplimientoILU > 0 ? Math.max(10, (totalesIncumplimientosEmpresa.incumplimientoILU / Math.max(totalesIncumplimientosEmpresa.incumplimientoPAT, totalesIncumplimientosEmpresa.incumplimientoILU, totalesIncumplimientosEmpresa.incumplimientoRUIDO, 1)) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 text-center">ILU</div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">{totalesIncumplimientosEmpresa.incumplimientoRUIDO}</div>
                  <div className="w-12 h-36 bg-gray-100 rounded relative overflow-hidden">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-red-500 rounded" 
                      style={{ height: `${totalesIncumplimientosEmpresa.incumplimientoRUIDO > 0 ? Math.max(10, (totalesIncumplimientosEmpresa.incumplimientoRUIDO / Math.max(totalesIncumplimientosEmpresa.incumplimientoPAT, totalesIncumplimientosEmpresa.incumplimientoILU, totalesIncumplimientosEmpresa.incumplimientoRUIDO, 1)) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 text-center">RUIDO</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    

      <div className="mb-6 ">
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="focus:ring-gray-500 h-10 text-gray-500 focus:border-gray-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
            placeholder="Buscar sucursales..."
          />
        </div>
      </div>

      {/* Tabla de sucursales */}
      <div className="bg-gray-100 rounded-3xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Sucursales</h3>
            <button type="button" className="p-2 rounded hover:bg-gray-100">
              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
        </div>
        
        {filteredSucursales.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No se encontraron sucursales para esta empresa.
        </div>
      ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sucursal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mediciones
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSucursales.map((sucursal) => (
                  <tr key={sucursal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-full ring-1 ring-gray-200">
                          <span className="text-gray-600 text-lg font-medium">
                          {sucursal.nombre.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{sucursal.nombre}</div>
                          <div className="text-sm text-gray-500">{sucursal.direccion || 'No disponible'}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            <div>Email: {sucursal.email || 'No disponible'}</div>
                            <div>Teléfono: {sucursal.telefono || 'No disponible'}</div>
                          </div>
                          {sucursal.categorias && sucursal.categorias.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {sucursal.categorias.map((cat) => (
                                <span key={cat} className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 ring-1 ring-gray-200">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {loadingMediciones ? (
                          <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-12"></div>
                          </div>
                        ) : (
                          <>
                            {medicionesEnNubePorSucursal[sucursal.id]?.length > 0 && (
                              <div className="text-xs text-gray-500">Última: {medicionesEnNubePorSucursal[sucursal.id][0]?.fecha || 'N/A'}</div>
                            )}
                          </>
                        )}
                    </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${sucursal.enNube ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'}`}>
                          {sucursal.enNube ? 'EN NUBE' : 'Local'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                          sucursal.estado === 'activa' ? 'bg-green-100 text-green-800 ring-1 ring-green-200' : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                      }`}>
                        {sucursal.estado === 'activa' ? 'Activa' : 'Inactiva'}
                      </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/empresas/${empresaId}/sucursales/${sucursal.id}`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 shadow-sm"
                      >
                        ver detalle
                        </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      )}
      </div>

      {/* Modal de agregar/editar sucursal */}
      {showModal && (
        <SucursalFormModal
          sucursal={currentSucursal}
          empresaId={empresaId}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            try {
              if (currentSucursal) {
                await updateSucursal(empresaId, currentSucursal.id, data);
              } else {
                await addSucursal({
                  ...data,
                  empresaId,
                } as Omit<Sucursal, 'id'>);
              }
              setShowModal(false);
            } catch (error) {
              console.error('Error al guardar sucursal:', error);
              alert('Error al guardar la sucursal');
            }
          }}
        />
      )}
    </div>
  );
}

interface SucursalFormModalProps {
  sucursal: Sucursal | null;
  empresaId: string;
  onClose: () => void;
  onSave: (data: Partial<Sucursal>) => void;
}

function SucursalFormModal({ sucursal, empresaId, onClose, onSave }: SucursalFormModalProps) {
  const [formData, setFormData] = useState<Partial<Sucursal>>(
    sucursal || {
      nombre: '',
      direccion: '',
      telefono: '',
      email: '',
      totalEmpleados: 0,
      estado: 'activa',
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'totalEmpleados' ? parseInt(value) || 0 : value 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {sucursal ? 'Editar Sucursal' : 'Agregar Sucursal'}
              </h3>
              
              <div className="mb-4">
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  id="nombre"
                  value={formData.nombre || ''}
                  onChange={handleChange}
                  required
                  className="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  id="direccion"
                  value={formData.direccion || ''}
                  onChange={handleChange}
                  className="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <input
                    type="text"
                    name="telefono"
                    id="telefono"
                    value={formData.telefono || ''}
                    onChange={handleChange}
                    className="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    className="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="totalEmpleados" className="block text-sm font-medium text-gray-700">Total Empleados</label>
                  <input
                    type="number"
                    name="totalEmpleados"
                    id="totalEmpleados"
                    value={formData.totalEmpleados || 0}
                    onChange={handleChange}
                    className="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="estado" className="block text-sm font-medium text-gray-700">Estado</label>
                  <select
                    name="estado"
                    id="estado"
                    value={formData.estado || 'activa'}
                    onChange={handleChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                  >
                    <option value="activa">Activa</option>
                    <option value="inactiva">Inactiva</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 