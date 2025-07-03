'use client';

import { useState } from 'react';
import { useMediciones } from '@/hooks/useMediciones';

interface DashboardProps {
  defaultEmpresa?: string;
  defaultSucursal?: string;
}

export default function Dashboard({ defaultEmpresa = '', defaultSucursal = '' }: DashboardProps) {
  const [empresa, setEmpresa] = useState(defaultEmpresa);
  const [sucursal, setSucursal] = useState(defaultSucursal);
  const [inputEmpresa, setInputEmpresa] = useState(defaultEmpresa);
  const [inputSucursal, setInputSucursal] = useState(defaultSucursal);
  
  const { mediciones, loading, error } = useMediciones(empresa, sucursal);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmpresa(inputEmpresa);
    setSucursal(inputSucursal);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard de Mediciones</h1>
      
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-white rounded shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="empresa" className="block text-sm font-medium text-gray-700">
              Empresa
            </label>
            <input
              type="text"
              id="empresa"
              value={inputEmpresa}
              onChange={(e) => setInputEmpresa(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Nombre de la empresa"
              required
            />
          </div>
          
          <div>
            <label htmlFor="sucursal" className="block text-sm font-medium text-gray-700">
              Sucursal
            </label>
            <input
              type="text"
              id="sucursal"
              value={inputSucursal}
              onChange={(e) => setInputSucursal(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Nombre de la sucursal"
              required
            />
          </div>
        </div>
        
        <div className="mt-4">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Buscar
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      ) : mediciones.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative">
          {empresa && sucursal 
            ? 'No se encontraron mediciones para esta empresa y sucursal.' 
            : 'Ingrese una empresa y sucursal para ver las mediciones.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden shadow">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Técnico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sucursal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mediciones.map((medicion) => (
                <tr key={medicion.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {medicion['FECHAS DE MEDICIÓN']}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {medicion.TÉCNICO}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {medicion.SERVICIO}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {medicion.SUCURSAL}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 