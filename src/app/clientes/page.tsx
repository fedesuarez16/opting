'use client';

import { useState } from 'react';

export default function ClientesPage() {
  const [search, setSearch] = useState('');

  // Datos vacíos para mostrar la estructura
  const empresasCliente: any[] = [];
  const totalSucursales = 0;
  const medicionesCounts = { puestaTierra: 0, ruido: 0, iluminacion: 0 };
  const sucursalesPorEmpresa: Record<string, number> = {};
  
  const loading = false;

  return (
    <div className='p-8 bg-white'>
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-b from-black to-gray-700 rounded-3xl p-6 text-white border border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Total sucursales</p>
              <p className="text-3xl font-bold tracking-tight">{totalSucursales}</p>
              <p className="text-green-400 text-sm">-0.03%</p>
            </div>
            <div className="text-gray-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-black to-gray-700 rounded-3xl p-6 text-white border border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Mediciones activas</p>
              <p className="text-3xl font-bold text-blue-400">0</p>
              <p className="text-green-400 text-sm">+0.00%</p>
            </div>
            <div className="text-gray-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-black to-gray-700 rounded-3xl p-6 text-white border border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Documentos</p>
              <p className="text-3xl font-bold">0</p>
              <p className="text-gray-400 text-sm">+0.00%</p>
            </div>
            <div className="text-gray-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-black to-gray-700 rounded-3xl p-6 text-white border border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Estado general</p>
              <p className="text-3xl font-bold text-green-400">OK</p>
              <p className="text-green-400 text-sm">Todo en orden</p>
            </div>
            <div className="text-gray-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico 1: Análisis de Mediciones */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">Análisis de Mediciones</h4>
            <span className="text-xs text-gray-400">Mi empresa</span>
          </div>
          
          <div className="flex items-end justify-center gap-4 h-48">
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-500 mb-1">0</div>
              <div className="w-12 h-36 bg-gray-100 rounded relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded" style={{ height: '5%' }} />
              </div>
              <div className="mt-2 text-xs text-gray-600 text-center">Total Sucursales</div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-500 mb-1">0</div>
              <div className="w-12 h-36 bg-gray-100 rounded relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 bg-green-500 rounded" style={{ height: '5%' }} />
              </div>
              <div className="mt-2 text-xs text-gray-600 text-center">PAT EN NUBE</div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-500 mb-1">0</div>
              <div className="w-12 h-36 bg-gray-100 rounded relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 bg-yellow-500 rounded" style={{ height: '5%' }} />
              </div>
              <div className="mt-2 text-xs text-gray-600 text-center">ILUMINACIÓN EN NUBE</div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-500 mb-1">0</div>
              <div className="w-12 h-36 bg-gray-100 rounded relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 bg-red-500 rounded" style={{ height: '5%' }} />
              </div>
              <div className="mt-2 text-xs text-gray-600 text-center">RUIDO EN NUBE</div>
            </div>
          </div>
        </div>

        {/* Gráfico 2: Mis Sucursales */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">Mis Sucursales</h4>
            <span className="text-xs text-gray-400">Estado actual</span>
          </div>
          
          <div className="space-y-4">
            <div className="text-xs text-gray-500 text-center">Sin sucursales registradas</div>
            <div className="flex items-center justify-center h-48">
              <div className="text-gray-400">
                <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h4a1 1 0 011 1v5m-6 0V9a1 1 0 011-1h4a1 1 0 011 1v11" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="mt-1 relative rounded-md shadow-sm flex-1 mr-4">
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
              className="bg-white h-10 block w-full pl-10 sm:text-sm rounded-md border-gray-300 ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              placeholder="Buscar mis datos..."
            />
          </div>
        </div>
      </div>

      {/* Tabla de datos del cliente */}
      <div className="bg-gray-100 rounded-3xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Mis Datos</h3>
            <button type="button" className="p-2 rounded hover:bg-gray-100">
              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 text-center text-gray-500">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
          <p className="text-gray-500">Aún no hay información para mostrar en su panel</p>
        </div>
      </div>
    </div>
  );
}
