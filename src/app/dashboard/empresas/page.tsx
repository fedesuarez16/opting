'use client';

import { useState } from 'react';

interface Empresa {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  totalSucursales: number;
  totalEmpleados: number;
  fechaCreacion: string;
  estado: 'activa' | 'inactiva';
}

const empresasMock: Empresa[] = [
  {
    id: '1',
    nombre: 'Empresa SRL',
    direccion: 'Av. Corrientes 1234, CABA',
    telefono: '011-4567-8901',
    email: 'contacto@empresasrl.com',
    totalSucursales: 3,
    totalEmpleados: 12,
    fechaCreacion: '2021-05-15',
    estado: 'activa',
  },
  {
    id: '2',
    nombre: 'TechSolutions Inc.',
    direccion: 'Av. Santa Fe 4321, CABA',
    telefono: '011-1234-5678',
    email: 'info@techsolutions.com',
    totalSucursales: 2,
    totalEmpleados: 8,
    fechaCreacion: '2022-01-10',
    estado: 'activa',
  },
  {
    id: '3',
    nombre: 'Innovación SA',
    direccion: 'Calle Rivadavia 567, Córdoba',
    telefono: '0351-765-4321',
    email: 'contacto@innovacion.com.ar',
    totalSucursales: 1,
    totalEmpleados: 5,
    fechaCreacion: '2020-11-22',
    estado: 'inactiva',
  },
];

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>(empresasMock);
  const [showModal, setShowModal] = useState(false);
  const [currentEmpresa, setCurrentEmpresa] = useState<Empresa | null>(null);
  const [search, setSearch] = useState('');

  const filteredEmpresas = empresas.filter(empresa => 
    empresa.nombre.toLowerCase().includes(search.toLowerCase()) ||
    empresa.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddEdit = (empresa: Empresa | null) => {
    setCurrentEmpresa(empresa);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta empresa?')) {
      setEmpresas(prevEmpresas => prevEmpresas.filter(empresa => empresa.id !== id));
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-2xl font-semibold text-gray-900">Empresas</h3>
          <p className="mt-1 text-sm text-gray-500">
            Gestione las empresas registradas en el sistema
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
            Agregar Empresa
          </button>
        </div>
      </div>

      <div className="mb-6">
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
            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
            placeholder="Buscar empresas..."
          />
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredEmpresas.map(empresa => (
            <li key={empresa.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-indigo-100 rounded-full">
                      <span className="text-indigo-600 text-xl">
                        {empresa.nombre.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-indigo-600 truncate">
                        {empresa.nombre}
                      </h4>
                      <p className="text-sm text-gray-500">{empresa.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      empresa.estado === 'activa' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {empresa.estado === 'activa' ? 'Activa' : 'Inactiva'}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAddEdit(empresa)}
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
                        onClick={() => handleDelete(empresa.id)}
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
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Dirección:</span> {empresa.direccion}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Teléfono:</span> {empresa.telefono}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Sucursales:</span> {empresa.totalSucursales}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Empleados:</span> {empresa.totalEmpleados}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Este sería el esqueleto para el modal de agregar/editar, 
          se implementaría con mayor detalle en una versión real */}
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
                  {currentEmpresa ? 'Editar Empresa' : 'Agregar Empresa'}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  Aquí iría el formulario para {currentEmpresa ? 'editar' : 'agregar'} una empresa
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