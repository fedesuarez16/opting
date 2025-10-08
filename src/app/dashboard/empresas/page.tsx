'use client';

import { useState, useEffect, useMemo } from 'react';
import { useEmpresas, Empresa } from '@/hooks/useEmpresas';
import Link from 'next/link';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import Breadcrumb from '@/components/Breadcrumb';
import { useSucursales } from '@/hooks/useSucursales';
import { useSucursalesCount } from '@/hooks/useSucursalesCount';
import { useMedicionesCounts } from '@/hooks/useArchivosCounts';

// Empresas de prueba para mostrar si no hay empresas en Firestore
const empresasMock: Empresa[] = [
  {
    id: 'mock-1',
    nombre: 'Empresa SRL (Mock)',
    direccion: 'Av. Corrientes 1234, CABA',
    telefono: '011-4567-8901',
    email: 'contacto@empresasrl.com',
    cuit: '30-12345678-9',
    totalSucursales: 3,
    totalEmpleados: 12,
    fechaCreacion: '2021-05-15',
    estado: 'activa',
  },
  {
    id: 'mock-2',
    nombre: 'TechSolutions Inc. (Mock)',
    direccion: 'Av. Santa Fe 4321, CABA',
    telefono: '011-1234-5678',
    email: 'info@techsolutions.com',
    cuit: '30-87654321-2',
    totalSucursales: 2,
    totalEmpleados: 8,
    fechaCreacion: '2022-01-10',
    estado: 'activa',
  },
];

export default function EmpresasPage() {
  const { empresas, loading, error, addEmpresa, updateEmpresa, deleteEmpresa, fetchEmpresas } = useEmpresas();
  const [showModal, setShowModal] = useState(false);
  const [currentEmpresa, setCurrentEmpresa] = useState<Empresa | null>(null);
  const [search, setSearch] = useState('');
  const [usarMock, setUsarMock] = useState(false);
  const [empresasAMostrar, setEmpresasAMostrar] = useState<Empresa[]>([]);
  const { sucursalesCounts: sucursalesPorEmpresa, loading: loadingSucursales, totalSucursales } = useSucursalesCount();
  const { medicionesCounts, loading: loadingMediciones } = useMedicionesCounts();

  // Depuración adicional
  useEffect(() => {
    console.log('Estado actual de empresas:', empresas);
    console.log('Estado de carga:', loading);
    console.log('Error:', error);
    
    // Verificar directamente la colección de empresas
    const verificarEmpresas = async () => {
      try {
        const empresasCollection = collection(firestore, 'empresas');
        const empresasSnapshot = await getDocs(empresasCollection);
        
        console.log('Número de documentos en empresas:', empresasSnapshot.size);
        console.log('¿Está vacío?', empresasSnapshot.empty);
        
        empresasSnapshot.forEach(doc => {
          console.log('Documento encontrado:', doc.id, doc.data());
        });
        
        // Si no hay empresas en Firestore, mostrar las empresas de prueba
        if (empresasSnapshot.empty || empresas.length === 0) {
          console.log('No hay empresas en Firestore, mostrando empresas de prueba');
          setUsarMock(true);
          setEmpresasAMostrar(empresasMock);
        } else {
          setUsarMock(false);
          setEmpresasAMostrar(empresas);
        }
      } catch (err) {
        console.error('Error al verificar empresas:', err);
        // En caso de error, mostrar las empresas de prueba
        setUsarMock(true);
        setEmpresasAMostrar(empresasMock);
      }
    };
    
    verificarEmpresas();
  }, [empresas, loading, error]);

  const filteredEmpresas = empresasAMostrar.filter(empresa => 
    empresa.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (empresa.email && empresa.email.toLowerCase().includes(search.toLowerCase()))
  );

  // Función para crear una empresa de prueba
  const crearEmpresaPrueba = async () => {
    try {
      const empresasCollection = collection(firestore, 'empresas');
      await addDoc(empresasCollection, {
        CLIENTE: 'Empresa de Prueba',
        direccion: 'Calle de Prueba 123',
        telefono: '123-456-7890',
        email: 'prueba@empresa.com',
        totalSucursales: 1,
        totalEmpleados: 5,
        fechaCreacion: new Date(),
        estado: 'activa'
      });
      
      alert('Empresa de prueba creada correctamente');
      fetchEmpresas(); // Recargar las empresas
    } catch (error) {
      console.error('Error al crear empresa de prueba:', error);
      alert('Error al crear empresa de prueba');
    }
  };

  const handleAddEdit = (empresa: Empresa | null) => {
    setCurrentEmpresa(empresa);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    // No permitir eliminar empresas mock
    if (id.startsWith('mock-')) {
      alert('No se pueden eliminar empresas de prueba');
      return;
    }
    
    if (confirm('¿Está seguro de que desea eliminar esta empresa?')) {
      deleteEmpresa(id).catch(error => {
        console.error('Error al eliminar empresa:', error);
        alert('Error al eliminar la empresa');
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
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
    <div className='p-8 bg-white'>
      {/* Add the breadcrumb at the top */}
      <Breadcrumb />
      
      
      
      
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      

        <div className="bg-gradient-to-b from-black to-gray-700 rounded-3xl p-6 text-white border border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Total sucursales</p>
              {loadingSucursales ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-300 rounded w-16"></div>
                </div>
              ) : (
                <p className="text-3xl font-bold tracking-tight">{totalSucursales}</p>
              )}
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
              <p className="text-3xl font-bold">{Math.floor(filteredEmpresas.length * 0.6)}</p>
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
              {loadingSucursales ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-300 rounded w-16"></div>
                </div>
              ) : (
                <p className="text-3xl font-bold">{Math.floor(totalSucursales * 0.63)}</p>
              )}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico 1: Análisis Global de Mediciones */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">Análisis Global de Mediciones</h4>
            <span className="text-xs text-gray-400">Todas las empresas</span>
          </div>
          
          {loadingSucursales || loadingMediciones ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-48 bg-gray-100 rounded" />
            </div>
          ) : (
            <div className="flex items-end justify-center gap-4 h-48">
              <div className="flex flex-col items-center">
                <div className="text-xs text-gray-500 mb-1">{totalSucursales}</div>
                <div className="w-12 h-36 bg-gray-100 rounded relative overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded" 
                    style={{ height: `${totalSucursales > 0 ? Math.max(15, (totalSucursales / Math.max(totalSucursales, medicionesCounts.puestaTierra, medicionesCounts.ruido, medicionesCounts.iluminacion, 1)) * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-600 text-center">Total Sucursales</div>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="text-xs text-gray-500 mb-1">{medicionesCounts.puestaTierra}</div>
                <div className="w-12 h-36 bg-gray-100 rounded relative overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-green-500 rounded" 
                    style={{ height: `${medicionesCounts.puestaTierra > 0 ? Math.max(15, (medicionesCounts.puestaTierra / Math.max(totalSucursales, medicionesCounts.puestaTierra, medicionesCounts.ruido, medicionesCounts.iluminacion, 1)) * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-600 text-center">PAT EN NUBE</div>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="text-xs text-gray-500 mb-1">{medicionesCounts.iluminacion}</div>
                <div className="w-12 h-36 bg-gray-100 rounded relative overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-yellow-500 rounded" 
                    style={{ height: `${medicionesCounts.iluminacion > 0 ? Math.max(15, (medicionesCounts.iluminacion / Math.max(totalSucursales, medicionesCounts.puestaTierra, medicionesCounts.ruido, medicionesCounts.iluminacion, 1)) * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-600 text-center">ILUMINACIÓN EN NUBE</div>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="text-xs text-gray-500 mb-1">{medicionesCounts.ruido}</div>
                <div className="w-12 h-36 bg-gray-100 rounded relative overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-red-500 rounded" 
                    style={{ height: `${medicionesCounts.ruido > 0 ? Math.max(15, (medicionesCounts.ruido / Math.max(totalSucursales, medicionesCounts.puestaTierra, medicionesCounts.ruido, medicionesCounts.iluminacion, 1)) * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-600 text-center">RUIDO EN NUBE</div>
              </div>
            </div>
          )}
        </div>

        {/* Gráfico 2: Sucursales por empresa */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">Sucursales por empresa</h4>
            <span className="text-xs text-gray-400">Top 8</span>
          </div>
          {loadingSucursales ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-48 bg-gray-100 rounded" />
            </div>
          ) : (
            (() => {
              const base = (empresasAMostrar.length > 0 ? empresasAMostrar : [])
                .map((e) => ({ id: e.id, label: e.nombre, value: sucursalesPorEmpresa[e.id] || 0 }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 6);
              const maxValue = Math.max(1, ...base.map((d) => d.value));
              return (
                <div className="space-y-4">
                  <div className="text-xs text-gray-500 text-center">Cantidad de sucursales por empresa</div>
                  {base.length === 0 ? (
                    <div className="text-xs text-gray-500">Sin datos.</div>
                  ) : (
                    <div className="flex items-end justify-center gap-3 h-48">
                      {base.map((d) => (
                        <div key={d.id} className="flex flex-col items-center">
                          <div className="text-[10px] text-gray-500 mb-1">{d.value}</div>
                          <div className="w-8 h-36 bg-gray-100 rounded relative overflow-hidden">
                            <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded" style={{ height: `${(d.value / maxValue) * 100}%` }} />
                          </div>
                          <div className="mt-1 text-[10px] text-gray-600 text-center truncate w-12" title={d.label}>{d.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      </div>


      {/* Search bar + Add button */}
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
              className="bg-white h-10 block w-full pl-10 sm:text-sm rounded-md border-gray-300 ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
              placeholder="Buscar empresas..."
            />
          </div>
          <button
            type="button"
            onClick={() => handleAddEdit(null)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 shadow-sm"
          >
            + Agregar empresa
          </button>
        </div>
      </div>

      {/* Tabla de empresas */}
      <div className="bg-gray-100 rounded-3xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Unidades de negocio</h3>
            <button type="button" className="p-2 rounded hover:bg-gray-100">
              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
        </div>
        
        {filteredEmpresas.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No se encontraron empresas.
          </div>
        ) : (
          <div className="overflow-x-auto ">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 ">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
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
                {filteredEmpresas.map((empresa) => (
                  <tr key={empresa.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-full ring-1 ring-gray-200">
                          <span className="text-gray-600 text-lg font-medium">
                            {empresa.nombre.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{empresa.nombre}</div>
                          <div className="text-sm text-gray-500">{empresa.email || 'No disponible'}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            <div>Dirección: {empresa.direccion || 'No disponible'}</div>
                            <div>Teléfono: {empresa.telefono || 'No disponible'}</div>
                            <div>CUIT: {empresa.cuit || 'No disponible'}</div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {loadingSucursales ? (
                          <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                          </div>
                        ) : (
                          <div>Sucursales: {sucursalesPorEmpresa[empresa.id] || 0}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-700 ring-1 ring-rose-200">
                        {Math.floor(Math.random() * 30) + 10} Incumplimientos
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/empresas/${empresa.id}/sucursales`}
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

      {/* Modal de agregar/editar empresa */}
      {showModal && (
        <EmpresaFormModal
          empresa={currentEmpresa}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            try {
              if (currentEmpresa) {
                await updateEmpresa(currentEmpresa.id, data);
              } else {
                await addEmpresa(data as Omit<Empresa, 'id'>);
              }
              setShowModal(false);
            } catch (error) {
              console.error('Error al guardar empresa:', error);
              alert('Error al guardar la empresa');
            }
          }}
        />
      )}
    </div>
  );
}

interface EmpresaFormModalProps {
  empresa: Empresa | null;
  onClose: () => void;
  onSave: (data: Partial<Empresa>) => void;
}

function EmpresaFormModal({ empresa, onClose, onSave }: EmpresaFormModalProps) {
  const [formData, setFormData] = useState<Partial<Empresa>>(
    empresa || {
      nombre: '',
      direccion: '',
      telefono: '',
      email: '',
      estado: 'activa',
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
                {empresa ? 'Editar Empresa' : 'Agregar Empresa'}
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
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
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
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
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
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
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
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="estado" className="block text-sm font-medium text-gray-700">Estado</label>
                <select
                  name="estado"
                  id="estado"
                  value={formData.estado || 'activa'}
                  onChange={handleChange}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="activa">Activa</option>
                  <option value="inactiva">Inactiva</option>
                </select>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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