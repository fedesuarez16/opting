'use client';

import { useState, useEffect } from 'react';
import { useEmpresas, Empresa } from '@/hooks/useEmpresas';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
// import { useSucursales } from '@/hooks/useSucursales';
import { useSucursalesCount } from '@/hooks/useSucursalesCount';
import { useMedicionesCounts } from '@/hooks/useArchivosCounts';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [currentEmpresa, setCurrentEmpresa] = useState<Empresa | null>(null);
  const [search, setSearch] = useState('');
  const [_usarMock, setUsarMock] = useState(false);
  const [empresasAMostrar, setEmpresasAMostrar] = useState<Empresa[]>([]);
  const { sucursalesCounts: sucursalesPorEmpresa, loading: loadingSucursales, totalSucursales } = useSucursalesCount();
  const { medicionesCounts, incumplimientosCounts, loading: loadingMediciones } = useMedicionesCounts();

  // Verificar rol del usuario y redirigir si es necesario
  useEffect(() => {
    const checkUserRole = async () => {
      if (authLoading || !user) {
        return;
      }

      try {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          
          // Redirigir gerente general a su página específica
          if (userData.role === 'general_manager') {
            console.log('General manager detected, redirecting to /empresagte');
            router.push('/empresagte');
            return;
          }
          
          // Redirigir gerente de sucursal a su página de sucursal específica
          if (userData.role === 'branch_manager' && userData.empresaId && userData.sucursalId) {
            console.log('Branch manager detected, redirecting to sucursal page');
            router.push(`/dashboard/empresas/${encodeURIComponent(userData.empresaId)}/sucursales/${encodeURIComponent(userData.sucursalId)}`);
            return;
          }
        }
      } catch (err) {
        console.error('Error checking user role:', err);
      }
    };

    checkUserRole();
  }, [user, authLoading, router]);

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
  const _crearEmpresaPrueba = async () => {
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

  const _handleDelete = (id: string) => {
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

  // Mostrar loading mientras se verifica el rol o se cargan los datos
  if (authLoading || loading) {
    return (
      <div className='p-8 bg-white min-h-full'>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-200 rounded-3xl p-6 h-32 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-2xl p-10 border border-gray-300 shadow-sm">
          <div className="h-[315px] bg-gray-100 rounded animate-pulse" />
        </div>
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
    <div className='p-4 sm:p-6 lg:p-8 bg-white'>
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
      

        <div className="bg-gradient-to-b from-stone-900 to-gray-700 bg-transparent border border-gray-800 shadow-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-300 text-xs sm:text-sm truncate">Total sucursales</p>
              {loadingSucursales ? (
                <div className="h-6 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 animate-pulse mt-1"></div>
              ) : (
                <p className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">{totalSucursales}</p>
              )}
              <p className="text-green-400 text-xs sm:text-sm mt-1">-0.03%</p>
            </div>
            <div className="text-gray-400 flex-shrink-0 ml-2">
              <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-stone-900 to-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white border border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-300 text-xs sm:text-sm truncate">Pendientes de Entrega PAT</p>
              {loadingMediciones ? (
                <div className="h-6 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 animate-pulse mt-1"></div>
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  {medicionesCounts.pat.pendienteVisita + medicionesCounts.pat.pedirTecnico + medicionesCounts.pat.procesar}
                </p>
              )}
            </div>
            <div className="text-gray-400 flex-shrink-0 ml-2">
              <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-stone-900 to-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white border border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-300 text-xs sm:text-sm truncate">Pendientes de Entrega Iluminación</p>
              {loadingMediciones ? (
                <div className="h-6 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 animate-pulse mt-1"></div>
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  {medicionesCounts.iluminacion.pendienteVisita + medicionesCounts.iluminacion.pedirTecnico + medicionesCounts.iluminacion.procesar}
                </p>
              )}
            </div>
            <div className="text-gray-400 flex-shrink-0 ml-2">
              <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-stone-900 to-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white border border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-300 text-xs sm:text-sm truncate">Pendientes de Entrega Ruido</p>
              {loadingMediciones ? (
                <div className="h-6 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 animate-pulse mt-1"></div>
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  {medicionesCounts.ruido.pendienteVisita + medicionesCounts.ruido.pedirTecnico + medicionesCounts.ruido.procesar}
                </p>
              )}
            </div>
            <div className="text-gray-400 flex-shrink-0 ml-2">
              <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Estados de Mediciones */}
      <div className="mb-4 sm:mb-6">
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-10 border border-gray-300 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h4 className="text-base sm:text-lg font-medium text-gray-900">Estados de Mediciones por Tipo de Estudio</h4>
            <span className="text-xs text-gray-400">Todas las empresas</span>
          </div>
          
          {loadingSucursales || loadingMediciones ? (
            <div className="h-[250px] sm:h-[315px] bg-gray-100 rounded animate-pulse" />
          ) : (
            (() => {
              const chartData = [
                {
                  name: "PAT",
                  "EN NUBE": medicionesCounts.pat.enNube,
                  "Procesar": medicionesCounts.pat.procesar,
                  "PEDIR A TEC": medicionesCounts.pat.pedirTecnico,
                  "PENDIENTE": medicionesCounts.pat.pendienteVisita
                },
                {
                  name: "Iluminación",
                  "EN NUBE": medicionesCounts.iluminacion.enNube,
                  "Procesar": medicionesCounts.iluminacion.procesar,
                  "PEDIR A TEC": medicionesCounts.iluminacion.pedirTecnico,
                  "PENDIENTE": medicionesCounts.iluminacion.pendienteVisita
                },
                {
                  name: "Ruido",
                  "EN NUBE": medicionesCounts.ruido.enNube,
                  "Procesar": medicionesCounts.ruido.procesar,
                  "PEDIR A TEC": medicionesCounts.ruido.pedirTecnico,
                  "PENDIENTE": medicionesCounts.ruido.pendienteVisita
                },
                {
                  name: "Carga Térmica",
                  "EN NUBE": medicionesCounts.cargaTermica.enNube,
                  "Procesar": medicionesCounts.cargaTermica.procesar,
                  "PEDIR A TEC": medicionesCounts.cargaTermica.pedirTecnico,
                  "PENDIENTE": medicionesCounts.cargaTermica.pendienteVisita
                },
                {
                  name: "ESTUDIO TERMOGRAFÍA",
                  "EN NUBE": medicionesCounts.termografia.enNube,
                  "Procesar": medicionesCounts.termografia.procesar,
                  "PEDIR A TEC": medicionesCounts.termografia.pedirTecnico,
                  "PENDIENTE": medicionesCounts.termografia.pendienteVisita
                }
              ];

              const chartConfig = {
                "EN NUBE": {
                  label: "EN NUBE",
                  color: "rgba(34, 197, 94, 0.4)"
                },
                "Procesar": {
                  label: "PROCESAR",
                  color: "rgba(59, 130, 246, 0.4)"
                },
                "PEDIR A TEC": {
                  label: "PEDIR A TEC",
                  color: "rgba(245, 158, 11, 0.4)"
                },
                "PENDIENTE": {
                  label: "PENDIENTE",
                  color: "rgba(239, 68, 68, 0.4)"
                }
              };

              return (
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <div className="min-w-[600px] sm:min-w-0">
                    <ChartContainer config={chartConfig} className="h-[250px] sm:h-[315px] text-black w-full">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Cantidad de Sucursales', angle: -90, position: 'insideLeft' }}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent />}
                        />
                        <Bar dataKey="EN NUBE" fill="rgba(3, 160, 61, 0.67)" radius={4} />
                        <Bar dataKey="Procesar" fill="rgba(4, 68, 171, 0.67)" radius={4} />
                        <Bar dataKey="PEDIR A TEC" fill="rgba(152, 97, 3, 0.67)" radius={4} />
                        <Bar dataKey="PENDIENTE" fill="rgba(151, 5, 5, 0.67)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>

    
      {/* Search bar + Add button */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-3">
          <div className="relative rounded-md shadow-sm flex-1">
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
              className="bg-white h-10 block w-full pl-10 sm:text-sm rounded-md border-gray-300 ring-1 ring-gray-200 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 placeholder-gray-400"
              placeholder="Buscar empresas..."
            />
          </div>
        
        </div>
      </div>

      {/* Tabla de empresas con estilos shadcn */}
      <div className="w-full">
        <div className="rounded-md border border-gray-200 shadow-md overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-white border-gray-100 text-gray-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
              <h3 className="text-base sm:text-lg font-semibold">Unidades de negocio</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-600">{filteredEmpresas.length} empresas</span>
              </div>
            </div>
          </div>

          {filteredEmpresas.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-gray-600 p-4">
              <div className="text-center">
                <p className="text-base sm:text-lg font-medium">No se encontraron empresas</p>
                <p className="text-xs sm:text-sm mt-1">Las empresas aparecerán aquí una vez que se agreguen al sistema.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Vista móvil - Cards simples */}
              <div className="sm:hidden space-y-3 p-4">
                {filteredEmpresas.map((empresa) => (
                  <div
                    key={empresa.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-gray-100">
                          {empresa.nombre.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-base text-gray-900 truncate">{empresa.nombre}</div>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/empresas/${empresa.id}/sucursales`}
                      className="inline-flex text-gray-700 items-center justify-center rounded-md text-sm font-medium transition-colors border border-gray-700 hover:bg-gray-50 hover:text-black h-9 px-3 flex-shrink-0"
                    >
                      Ver detalle
                    </Link>
                  </div>
                ))}
              </div>

              {/* Vista desktop - Tabla completa */}
              <div className="hidden sm:block relative text-gray-500">
                <table className="w-full text-gray-500 caption-bottom text-sm">
                  <thead className="border-gray-200">
                    <tr className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                      <th className="h-12 px-4 text-left align-middle font-medium text-gray-600 text-sm">
                        Nombre
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-gray-600 text-sm">
                        Teléfono
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-gray-600 text-sm hidden md:table-cell">
                        CUIT
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-gray-600 text-sm">
                        Sucursales
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-gray-600 text-sm">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {filteredEmpresas.map((empresa) => (
                      <tr
                        key={empresa.id}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                      >
                        <td className="p-4 align-middle font-medium">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-gray-100">
                                {empresa.nombre.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-base truncate">{empresa.nombre}</div>
                              <div className="text-sm text-gray-600 truncate">
                                {empresa.email || 'Sin email'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <span className="text-sm">
                            {empresa.telefono || (
                              <span className="text-gray-600">No disponible</span>
                            )}
                          </span>
                        </td>
                        <td className="p-4 align-middle font-mono text-sm hidden md:table-cell">
                          {empresa.cuit || (
                            <span className="text-gray-600">No disponible</span>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          {loadingSucursales ? (
                            <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-base">{sucursalesPorEmpresa[empresa.id] || 0}</span>
                              <span className="text-xs text-gray-600">sucursales</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <Link
                            href={`/dashboard/empresas/${empresa.id}/sucursales`}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-gray-300 hover:bg-gray-50 hover:text-gray-900 h-9 px-3 whitespace-nowrap"
                          >
                            Ver detalle
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
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
              
              <div className="mb-4">
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