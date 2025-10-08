'use client';

import { useState } from 'react';

interface Sucursal {
  id: string;
  nombre: string;
  empresaId: string;
  empresaNombre: string;
  direccion: string;
  telefono: string;
  email: string;
  totalEmpleados: number;
  fechaCreacion: string;
  estado: 'activa' | 'inactiva';
  manager: string;
  enNube?: boolean;
}

const sucursalesMock: Sucursal[] = [
  {
    id: '1',
    nombre: 'Sucursal Centro',
    empresaId: '1',
    empresaNombre: 'Empresa SRL',
    direccion: 'Av. Corrientes 1234, CABA',
    telefono: '011-4567-8901',
    email: 'centro@empresasrl.com',
    totalEmpleados: 5,
    fechaCreacion: '2021-06-10',
    estado: 'activa',
    manager: 'Juan Pérez',
    enNube: true,
  },
  {
    id: '2',
    nombre: 'Sucursal Norte',
    empresaId: '1',
    empresaNombre: 'Empresa SRL',
    direccion: 'Av. Libertador 5678, Vicente López',
    telefono: '011-5678-9012',
    email: 'norte@empresasrl.com',
    totalEmpleados: 4,
    fechaCreacion: '2021-08-15',
    estado: 'activa',
    manager: 'Laura Gómez',
    enNube: false,
  },
  {
    id: '3',
    nombre: 'Sucursal Central',
    empresaId: '2',
    empresaNombre: 'TechSolutions Inc.',
    direccion: 'Av. Córdoba 834, CABA',
    telefono: '011-2345-6789',
    email: 'central@techsolutions.com',
    totalEmpleados: 6,
    fechaCreacion: '2022-02-20',
    estado: 'activa',
    manager: 'Carlos Martínez',
    enNube: true,
  },
  {
    id: '4',
    nombre: 'Sucursal Sur',
    empresaId: '1',
    empresaNombre: 'Empresa SRL',
    direccion: 'Av. Hipólito Yrigoyen 8765, Lanús',
    telefono: '011-6789-0123',
    email: 'sur@empresasrl.com',
    totalEmpleados: 3,
    fechaCreacion: '2022-03-05',
    estado: 'inactiva',
    manager: 'Marcela Rodríguez',
    enNube: false,
  },
];

const empresasMock = [
  { id: '1', nombre: 'Empresa SRL' },
  { id: '2', nombre: 'TechSolutions Inc.' },
  { id: '3', nombre: 'Innovación SA' },
];

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>(sucursalesMock);
  const [showModal, setShowModal] = useState(false);
  const [currentSucursal, setCurrentSucursal] = useState<Sucursal | null>(null);
  const [search, setSearch] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState('');

  const filteredSucursales = sucursales.filter(sucursal => {
    const matchesSearch = 
      sucursal.nombre.toLowerCase().includes(search.toLowerCase()) ||
      sucursal.direccion.toLowerCase().includes(search.toLowerCase()) ||
      sucursal.empresaNombre.toLowerCase().includes(search.toLowerCase());
    
    const matchesEmpresa = empresaFilter ? sucursal.empresaId === empresaFilter : true;
    
    return matchesSearch && matchesEmpresa;
  });

  const handleAddEdit = (sucursal: Sucursal | null) => {
    setCurrentSucursal(sucursal);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta sucursal?')) {
      setSucursales(prevSucursales => prevSucursales.filter(sucursal => sucursal.id !== id));
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-2xl font-semibold text-gray-900">Sucursales</h3>
          <p className="mt-1 text-sm text-gray-500">
            Gestione las sucursales de cada empresa
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            onClick={() => handleAddEdit(null)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Agregar Sucursal
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-2">
          <div className="relative rounded-md shadow-sm">
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
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="Buscar sucursales..."
            />
          </div>
        </div>
        <div>
          <select
            id="empresa-filter"
            value={empresaFilter}
            onChange={e => setEmpresaFilter(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">Todas las empresas</option>
            {empresasMock.map(empresa => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Sucursal
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Empresa
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Dirección
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Encargado
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Estado
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSucursales.map((sucursal) => (
                    <tr key={sucursal.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-indigo-100 rounded-full">
                            <span className="text-indigo-600 text-xl">
                              {sucursal.nombre.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{sucursal.nombre}</div>
                            <div className="text-sm text-gray-500">{sucursal.email}</div>
                          </div>
                          <span className={`ml-3 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${sucursal.enNube ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'}`}>
                            {sucursal.enNube ? 'En nube' : 'Local'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{sucursal.empresaNombre}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{sucursal.direccion}</div>
                        <div className="text-sm text-gray-500">{sucursal.telefono}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{sucursal.manager}</div>
                        <div className="text-sm text-gray-500">{sucursal.totalEmpleados} empleados</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            sucursal.estado === 'activa'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {sucursal.estado === 'activa' ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2 justify-end">
                          <button
                            onClick={() => handleAddEdit(sucursal)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <svg
                              className="h-5 w-5"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(sucursal.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <svg
                              className="h-5 w-5"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para agregar/editar sucursal */}
      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {currentSucursal ? 'Editar Sucursal' : 'Agregar Sucursal'}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  Aquí iría el formulario para {currentSucursal ? 'editar' : 'agregar'} una sucursal
                </p>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 