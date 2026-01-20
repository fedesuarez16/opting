'use client';

import { useState, useEffect, useMemo } from 'react';
import { useEmpresas, Empresa } from '@/hooks/useEmpresas';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs, addDoc, collectionGroup } from 'firebase/firestore';
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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStudyType, setSelectedStudyType] = useState<'pat' | 'iluminacion' | 'ruido' | null>(null);
  const [studyCountsByEmpresa, setStudyCountsByEmpresa] = useState<Record<string, number>>({});
  const [loadingStudyDetails, setLoadingStudyDetails] = useState(false);
  const [totalServicios, setTotalServicios] = useState<number>(0);
  const [loadingServicios, setLoadingServicios] = useState(false);

  // Obtener suma total de todos los servicios (contando todas las mediciones con servicio)
  useEffect(() => {
    const fetchTotalServicios = async () => {
      setLoadingServicios(true);
      try {
        const medicionesQuery = collectionGroup(firestore, 'mediciones');
        const medicionesSnapshot = await getDocs(medicionesQuery);
        
        let totalCount = 0;
        
        medicionesSnapshot.forEach((doc) => {
          const datos = doc.data() as Record<string, unknown>;
          const getValue = (k: string) => String((datos[k] ?? '') as unknown);
          
          const servicio = getValue('SERVICIO') || getValue('servicio');
          
          // Contar todas las mediciones que tengan un servicio (no únicos, sino total)
          if (servicio && servicio.trim() !== '') {
            totalCount += 1;
          }
        });
        
        setTotalServicios(totalCount);
      } catch (error) {
        console.error('Error al obtener total de servicios:', error);
      } finally {
        setLoadingServicios(false);
      }
    };

    fetchTotalServicios();
  }, []);

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

  // Función para obtener conteos por empresa para un tipo de estudio
  const fetchStudyCountsByEmpresa = async (studyType: 'pat' | 'iluminacion' | 'ruido') => {
    setLoadingStudyDetails(true);
    try {
      const medicionesQuery = collectionGroup(firestore, 'mediciones');
      const medicionesSnapshot = await getDocs(medicionesQuery);
      
      const countsByEmpresa: Record<string, number> = {};
      
      medicionesSnapshot.forEach((doc) => {
        const datos = doc.data() as Record<string, unknown>;
        const getValue = (k: string) => String((datos[k] ?? '') as unknown);
        
        // Obtener el CLIENTE (empresaId) de la medición
        const clienteId = getValue('CLIENTE');
        if (!clienteId) return;
        
        let studyValue = '';
        if (studyType === 'pat') {
          studyValue = getValue('PAT');
        } else if (studyType === 'iluminacion') {
          studyValue = getValue('ILUMINACIÓN');
        } else if (studyType === 'ruido') {
          studyValue = getValue('RUIDO');
        }
        
        // Contar solo los que NO están en nube (pendiente, pedir a tec, procesar)
        if (studyValue === 'PENDIENTE' || studyValue === 'PEDIR A TEC' || studyValue === 'PROCESAR') {
          if (!countsByEmpresa[clienteId]) {
            countsByEmpresa[clienteId] = 0;
          }
          countsByEmpresa[clienteId] += 1;
        }
      });
      
      setStudyCountsByEmpresa(countsByEmpresa);
    } catch (error) {
      console.error('Error al obtener conteos por empresa:', error);
    } finally {
      setLoadingStudyDetails(false);
    }
  };

  const handleCardClick = (studyType: 'pat' | 'iluminacion' | 'ruido') => {
    setSelectedStudyType(studyType);
    setShowDetailModal(true);
    fetchStudyCountsByEmpresa(studyType);
  };


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
      

        <div 
          className="bg-gradient-to-b from-stone-900 to-gray-700 bg-transparent border border-gray-800 shadow-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => router.push('/dashboard/servicios')}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-300 text-xs sm:text-sm truncate">Total servicios</p>
              {loadingServicios ? (
                <div className="h-6 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 animate-pulse mt-1"></div>
              ) : (
                <p className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">{totalServicios}</p>
              )}
            </div>
            <div className="text-gray-400 flex-shrink-0 ml-2">
              <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="bg-gradient-to-b from-stone-900 to-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white border border-gray-800 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => handleCardClick('pat')}
        >
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

        <div 
          className="bg-gradient-to-b from-stone-900 to-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white border border-gray-800 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => handleCardClick('iluminacion')}
        >
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

        <div 
          className="bg-gradient-to-b from-stone-900 to-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white border border-gray-800 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => handleCardClick('ruido')}
        >
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
            <h4 className="text-base sm:text-lg font-medium text-gray-900">Estado de Procesamiento de los Monitoreos Laborales</h4>
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
                  name: "TERMOGRAFÍA",
                  "EN NUBE": medicionesCounts.termografia.enNube,
                  "Procesar": medicionesCounts.termografia.procesar,
                  "PEDIR A TEC": medicionesCounts.termografia.pedirTecnico,
                  "PENDIENTE": medicionesCounts.termografia.pendienteVisita
                },
                {
                  name: "INF. PRUEBA DISYUNTORES",
                  "EN NUBE": (medicionesCounts as any).informePruebaDinamicaDisyuntores?.enNube || 0,
                  "Procesar": (medicionesCounts as any).informePruebaDinamicaDisyuntores?.procesar || 0,
                  "PEDIR A TEC": (medicionesCounts as any).informePruebaDinamicaDisyuntores?.pedirTecnico || 0,
                  "PENDIENTE": (medicionesCounts as any).informePruebaDinamicaDisyuntores?.pendienteVisita || 0
                }
              ];

              const chartConfig = {
                "EN NUBE": {
                  label: "EN NUBE",
                  color: "#22c55e"
                },
                "Procesar": {
                  label: "PROCESAR",
                  color: "#3b82f6"
                },
                "PEDIR A TEC": {
                  label: "PEDIR A TEC",
                  color: "#f59e0b"
                },
                "PENDIENTE": {
                  label: "PENDIENTE",
                  color: "#ef4444"
                }
              };

              return (
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <div className="min-w-[700px] sm:min-w-0">
                    <ChartContainer config={chartConfig} className="h-[280px] sm:h-[380px] text-black w-full">
                      <BarChart data={chartData} margin={{ bottom: 60, left: 10, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                          tickMargin={8}
                      axisLine={false}
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={70}
                          interval={0}
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
                        <Bar dataKey="EN NUBE" fill="#22c55e" radius={4} />
                        <Bar dataKey="Procesar" fill="#3b82f6" radius={4} />
                        <Bar dataKey="PEDIR A TEC" fill="#f59e0b" radius={4} />
                        <Bar dataKey="PENDIENTE" fill="#ef4444" radius={4} />
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

      {/* Tabla de empresas - Diseño minimalista */}
      <div className="w-full">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Unidades de negocio</h3>
                <p className="text-sm text-gray-500 mt-1">{filteredEmpresas.length} empresa{filteredEmpresas.length !== 1 ? 's' : ''} registrada{filteredEmpresas.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {filteredEmpresas.length === 0 ? (
            <div className="h-64 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-1">No se encontraron empresas</p>
                <p className="text-sm text-gray-500">Las empresas aparecerán aquí una vez que se agreguen al sistema.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Vista móvil - Cards minimalistas */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filteredEmpresas.map((empresa) => (
                  <div
                    key={empresa.id}
                    className="p-5 hover:bg-gray-50 transition-colors active:bg-gray-100"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-lg font-semibold text-white">
                          {empresa.nombre.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1 truncate">{empresa.nombre}</h4>
                        <div className="space-y-1.5 mb-4">
                          {empresa.email && (
                            <p className="text-sm text-gray-600 truncate flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {empresa.email}
                            </p>
                          )}
                          {empresa.telefono && (
                            <p className="text-sm text-gray-600 truncate flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {empresa.telefono}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">
                              {loadingSucursales ? (
                                <span className="inline-block w-8 h-4 bg-gray-200 rounded animate-pulse"></span>
                              ) : (
                                `${sucursalesPorEmpresa[empresa.id] || 0} sucursal${(sucursalesPorEmpresa[empresa.id] || 0) !== 1 ? 'es' : ''}`
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddEdit(empresa)}
                            className="inline-flex items-center justify-center flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors active:scale-[0.98]"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                          <Link
                            href={`/dashboard/empresas/${empresa.id}/sucursales`}
                            className="inline-flex items-center justify-center flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors active:scale-[0.98]"
                          >
                            Ver detalle
                            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista desktop - Tabla minimalista */}
              <div className="hidden sm:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Empresa
                    </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Contacto
                    </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      CUIT
                    </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Sucursales
                    </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Acción
                    </th>
                  </tr>
                </thead>
                    <tbody className="divide-y divide-gray-50">
                  {filteredEmpresas.map((empresa) => (
                    <tr
                      key={empresa.id}
                          className="hover:bg-gray-50 transition-colors group"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                                <span className="text-base font-semibold text-white">
                              {empresa.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-gray-900 truncate mb-0.5">{empresa.nombre}</div>
                                {empresa.email && (
                                  <div className="text-sm text-gray-500 truncate flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {empresa.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {empresa.telefono ? (
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {empresa.telefono}
                          </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                          <td className="px-6 py-5 hidden md:table-cell">
                            {empresa.cuit ? (
                              <span className="text-sm font-mono text-gray-700">{empresa.cuit}</span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                          <td className="px-6 py-5">
                        {loadingSucursales ? (
                              <div className="h-5 w-12 bg-gray-200 rounded animate-pulse"></div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="text-sm font-medium text-gray-900">{sucursalesPorEmpresa[empresa.id] || 0}</span>
                          </div>
                        )}
                      </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleAddEdit(empresa)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all group-hover:shadow-sm"
                                title="Editar empresa"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span className="hidden lg:inline">Editar</span>
                              </button>
                              <Link
                                href={`/dashboard/empresas/${empresa.id}/sucursales`}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all group-hover:shadow-sm"
                              >
                                Ver
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </Link>
                            </div>
                          </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {/* Modal de detalle por empresa */}
      {showDetailModal && selectedStudyType && (
        <StudyDetailModal
          studyType={selectedStudyType}
          countsByEmpresa={studyCountsByEmpresa}
          empresas={empresas}
          loading={loadingStudyDetails}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedStudyType(null);
            setStudyCountsByEmpresa({});
          }}
        />
      )}

    </div>
  );
}

interface StudyDetailModalProps {
  studyType: 'pat' | 'iluminacion' | 'ruido';
  countsByEmpresa: Record<string, number>;
  empresas: Empresa[];
  loading: boolean;
  onClose: () => void;
}

function StudyDetailModal({ studyType, countsByEmpresa, empresas, loading, onClose }: StudyDetailModalProps) {
  const studyNames = {
    pat: 'PAT',
    iluminacion: 'Iluminación',
    ruido: 'Ruido'
  };

  // Crear array de empresas con sus conteos, ordenado por nombre
  const empresasWithCounts = useMemo(() => {
    return empresas
      .map(empresa => ({
        empresa,
        count: countsByEmpresa[empresa.id] || 0
      }))
      .filter(item => item.count > 0) // Solo mostrar empresas con conteo > 0
      .sort((a, b) => b.count - a.count); // Ordenar por conteo descendente
  }, [empresas, countsByEmpresa]);

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity z-40" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {studyNames[studyType]}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {loading ? (
              <div className="py-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            ) : empresasWithCounts.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>No hay estudios pendientes de entrega para este tipo.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {empresasWithCounts.map(({ empresa, count }) => (
                  <div
                    key={empresa.id}
                    className="flex items-center justify-between py-3 px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-base font-medium text-gray-900">{empresa.nombre}</span>
                      <div className="text-sm text-gray-500 mt-1">{count} pendiente{count !== 1 ? 's' : ''}</div>
                    </div>
                    <Link
                      href={`/dashboard/empresas/${encodeURIComponent(empresa.id)}/sucursales`}
                      className="ml-4 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex-shrink-0"
                      onClick={onClose}
                    >
                      Ver sucursales
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
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
      cuit: '',
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
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity z-40" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
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
                <label htmlFor="cuit" className="block text-sm font-medium text-gray-700">CUIT</label>
                <input
                  type="text"
                  name="cuit"
                  id="cuit"
                  value={formData.cuit || ''}
                  onChange={handleChange}
                  placeholder="30-12345678-9"
                  className="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md font-mono"
                />
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