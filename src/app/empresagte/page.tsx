'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useMediciones } from '@/hooks/useMediciones';
import { useSucursales } from '@/hooks/useSucursales';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import OneDriveFolders from '@/components/OneDriveFolders';
import Sidebar from '@/components/Sidebar';
import Breadcrumb from '@/components/Breadcrumb';

export default function EmpresaGerentePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [empresaIdFromUser, setEmpresaIdFromUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [showExtintoresModal, setShowExtintoresModal] = useState(false);
  const [showIncumplimientoModal, setShowIncumplimientoModal] = useState(false);
  const [selectedIncumplimientoType, setSelectedIncumplimientoType] = useState<'pat' | 'iluminacion' | 'ruido' | null>(null);
  const [sucursalesConIncumplimiento, setSucursalesConIncumplimiento] = useState<Array<{ sucursalId: string; sucursalNombre: string }>>([]);
  
  const { empresas } = useEmpresas();
  const empresa = empresas.find(e => e.id === empresaIdFromUser);
  const empresaId = empresa?.id || empresaIdFromUser || undefined;
  const empresaAsignadaNombre = empresa?.nombre;
  const { mediciones, loading: loadingMediciones } = useMediciones(empresaId);
  const { sucursales } = useSucursales(empresaId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchEmpresaAsignada = async () => {
      if (!user) return;

      try {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          // Primero intentar obtener empresaId, si no existe, usar empresaNombre
          if (userData.empresaId) {
            setEmpresaIdFromUser(userData.empresaId);
          } else if (userData.empresaNombre) {
            // Si solo hay empresaNombre, buscar el ID en la lista de empresas
            const foundEmpresa = empresas.find(e => e.nombre === userData.empresaNombre);
            if (foundEmpresa) {
              setEmpresaIdFromUser(foundEmpresa.id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching empresa asignada:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresaAsignada();
  }, [user, authLoading, router, empresas]);

  // Conteos de incumplimientos específicos para esta empresa
  const incumplimientosCountsEmpresa = useMemo(() => {
    const counts = {
      patNoCumple: 0,
      iluNoCumple: 0,
      ruidoNoCumple: 0
    };

    mediciones.forEach((m) => {
      const datos = m.datos as Record<string, unknown>;
      const getValue = (k: string) => String((datos[k] ?? '') as any);
      
      // INCUMPLIMIENTOS
      const incumplimientoPAT = getValue('INCUMPLIMIENTO PAT');
      if (incumplimientoPAT === 'NO CUMPLE') counts.patNoCumple += 1;
      
      const incumplimientoILU = getValue('INCUMPLIMIENTO ILUM');
      if (incumplimientoILU === 'NO CUMPLE') counts.iluNoCumple += 1;
      
      const incumplimientoRUIDO = getValue('INCUMPLIMIENTO RUIDO');
      if (incumplimientoRUIDO === 'NO CUMPLE') counts.ruidoNoCumple += 1;
    });

    console.log('Incumplimientos counts para empresa:', empresaId, counts);
    return counts;
  }, [mediciones, empresaId]);

  // Conteos de incumplimientos para el gráfico (solo CUMPLE y NO CUMPLE)
  const incumplimientosCountsForChart = useMemo(() => {
    const counts = {
      pat: {
        cumple: 0,
        noCumple: 0
      },
      iluminacion: {
        cumple: 0,
        noCumple: 0
      },
      ruido: {
        cumple: 0,
        noCumple: 0
      },
      termografia: {
        cumple: 0,
        noCumple: 0
      },
      cargaTermica: {
        cumple: 0,
        noCumple: 0
      },
      informePruebaDinamicaDisyuntores: {
        cumple: 0,
        noCumple: 0
      }
    };

    mediciones.forEach((m) => {
      const datos = m.datos as Record<string, unknown>;
      const getValue = (k: string) => String((datos[k] ?? '') as any);
      
      // INCUMPLIMIENTO PAT
      const incumplimientoPAT = getValue('INCUMPLIMIENTO PAT');
      if (incumplimientoPAT === 'CUMPLE') counts.pat.cumple += 1;
      else if (incumplimientoPAT === 'NO CUMPLE') counts.pat.noCumple += 1;
      
      // INCUMPLIMIENTO ILUM
      const incumplimientoILU = getValue('INCUMPLIMIENTO ILUM');
      if (incumplimientoILU === 'CUMPLE') counts.iluminacion.cumple += 1;
      else if (incumplimientoILU === 'NO CUMPLE') counts.iluminacion.noCumple += 1;
      
      // INCUMPLIMIENTO RUIDO
      const incumplimientoRUIDO = getValue('INCUMPLIMIENTO RUIDO');
      if (incumplimientoRUIDO === 'CUMPLE') counts.ruido.cumple += 1;
      else if (incumplimientoRUIDO === 'NO CUMPLE') counts.ruido.noCumple += 1;
      
      // INCUMPLIMIENTOS TERMOGRAFÍA
      const incumplimientoTERMO = getValue('INCUMPLIMIENTOS TERMOGRAFÍA') || getValue('INCUMPLIMIENTOS TERMOGRAFÍA');
      if (incumplimientoTERMO === 'CUMPLE') counts.termografia.cumple += 1;
      else if (incumplimientoTERMO === 'NO CUMPLE') counts.termografia.noCumple += 1;
      
      // INCUMPLIMIENTO CARGA TÉRMICA
      const incumplimientoCARGA = getValue('INCUMPLIMIENTO CARGA TERMICA') || getValue('INCUMPLIENTO CARGA TERMICA');
      if (incumplimientoCARGA === 'CUMPLE') counts.cargaTermica.cumple += 1;
      else if (incumplimientoCARGA === 'NO CUMPLE') counts.cargaTermica.noCumple += 1;
      
      // INFORME PRUEBA DINAMICA DISYUNTORES
      const incumplimientoPRUEBA = getValue('INCUMPLIMIENTO INFORME PRUEBA DINAMICA DISYUNTORES') || getValue('INCUMPLIMIENTO PRUEBA DINAMICA DISYUNTORES');
      if (incumplimientoPRUEBA === 'CUMPLE') counts.informePruebaDinamicaDisyuntores.cumple += 1;
      else if (incumplimientoPRUEBA === 'NO CUMPLE') counts.informePruebaDinamicaDisyuntores.noCumple += 1;
    });

    return counts;
  }, [mediciones]);

  // Conteos de mediciones por tipo de estudio para esta empresa específica
  const medicionesCountsEmpresa = useMemo(() => {
    const counts = {
      pat: {
        pendienteVisita: 0,
        pedirTecnico: 0,
        procesar: 0,
        enNube: 0
      },
      iluminacion: {
        pendienteVisita: 0,
        pedirTecnico: 0,
        procesar: 0,
        enNube: 0
      },
      ruido: {
        pendienteVisita: 0,
        pedirTecnico: 0,
        procesar: 0,
        enNube: 0
      },
      cargaTermica: {
        pendienteVisita: 0,
        pedirTecnico: 0,
        procesar: 0,
        enNube: 0
      },
      termografia: {
        pendienteVisita: 0,
        pedirTecnico: 0,
        procesar: 0,
        enNube: 0
      }
    };

    mediciones.forEach((m) => {
      const datos = m.datos as Record<string, unknown>;
      const getValue = (k: string) => String((datos[k] ?? '') as any);
      
      // PAT - buscar primero 'PAT', luego 'PUESTA A TIERRA' como fallback
      const patValue = getValue('PAT') || getValue('PUESTA A TIERRA');
      if (patValue === 'PENDIENTE') counts.pat.pendienteVisita += 1;
      else if (patValue === 'PEDIR A TEC') counts.pat.pedirTecnico += 1;
      else if (patValue === 'PROCESAR') counts.pat.procesar += 1;
      else if (patValue === 'EN NUBE') counts.pat.enNube += 1;
      
      // ILUMINACIÓN
      const iluValue = getValue('ILUMINACIÓN');
      if (iluValue === 'PENDIENTE') counts.iluminacion.pendienteVisita += 1;
      else if (iluValue === 'PEDIR A TEC') counts.iluminacion.pedirTecnico += 1;
      else if (iluValue === 'PROCESAR') counts.iluminacion.procesar += 1;
      else if (iluValue === 'EN NUBE') counts.iluminacion.enNube += 1;
      
      // RUIDO
      const ruidoValue = getValue('RUIDO');
      if (ruidoValue === 'PENDIENTE') counts.ruido.pendienteVisita += 1;
      else if (ruidoValue === 'PEDIR A TEC') counts.ruido.pedirTecnico += 1;
      else if (ruidoValue === 'PROCESAR') counts.ruido.procesar += 1;
      else if (ruidoValue === 'EN NUBE') counts.ruido.enNube += 1;
      
      // CARGA TÉRMICA
      const cargaValue = getValue('CARGA TÉRMICA');
      if (cargaValue === 'PENDIENTE') counts.cargaTermica.pendienteVisita += 1;
      else if (cargaValue === 'PEDIR A TEC') counts.cargaTermica.pedirTecnico += 1;
      else if (cargaValue === 'PROCESAR') counts.cargaTermica.procesar += 1;
      else if (cargaValue === 'EN NUBE') counts.cargaTermica.enNube += 1;
      
      // ESTUDIO TERMOGRAFÍA
      const termoValue = getValue('ESTUDIO TERMOGRAFIA');
      if (termoValue === 'PENDIENTE') counts.termografia.pendienteVisita += 1;
      else if (termoValue === 'PEDIR A TEC') counts.termografia.pedirTecnico += 1;
      else if (termoValue === 'PROCESAR') counts.termografia.procesar += 1;
      else if (termoValue === 'EN NUBE') counts.termografia.enNube += 1;
    });

    console.log('Mediciones counts para empresa:', empresaId, counts);
    return counts;
  }, [mediciones, empresaId]);

  // Calcular extintores que vencen el mes siguiente
  const extintoresVencenMesSiguiente = useMemo(() => {
    const ahora = new Date();
    const mesSiguiente = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
    const finMesSiguiente = new Date(ahora.getFullYear(), ahora.getMonth() + 2, 0);
    
    const sucursalesConExtintoresVencen: Array<{
      sucursalId: string;
      sucursalNombre: string;
      fechaVencimiento: string;
    }> = [];

    // Agrupar mediciones por sucursal
    const medicionesPorSucursal = new Map<string, typeof mediciones>();
    mediciones.forEach((m) => {
      const sucursalId = m.sucursalId;
      if (sucursalId) {
        if (!medicionesPorSucursal.has(sucursalId)) {
          medicionesPorSucursal.set(sucursalId, []);
        }
        medicionesPorSucursal.get(sucursalId)!.push(m);
      }
    });

    // Para cada sucursal, obtener la fecha más reciente de extintores
    medicionesPorSucursal.forEach((medicionesSucursal, sucursalId) => {
      let fechaMasReciente: Date | null = null;
      let fechaMasRecienteStr: string | null = null;

      medicionesSucursal.forEach((m) => {
        const datos = m.datos as Record<string, unknown>;
        const getValue = (k: string) => String((datos[k] ?? '') as any);
        
        const fechaExtintoresValue = getValue('FECHA EXTINTORES') || 
                                     getValue('FECHA EXTINTOR') || 
                                     getValue('FECHA DE EXTINTORES') ||
                                     getValue('FECHA REGISTRO EXTINTORES');
        
        if (fechaExtintoresValue && fechaExtintoresValue.trim() !== '') {
          try {
            const fecha = new Date(fechaExtintoresValue);
            if (!isNaN(fecha.getTime())) {
              if (!fechaMasReciente || fecha > fechaMasReciente) {
                fechaMasReciente = fecha;
                fechaMasRecienteStr = fechaExtintoresValue;
              }
            }
          } catch (e) {
            // Ignorar errores de parsing
          }
        }
      });

      // Verificar si la fecha está en el mes siguiente
      if (fechaMasReciente && fechaMasReciente >= mesSiguiente && fechaMasReciente <= finMesSiguiente) {
        const sucursal = sucursales.find(s => s.id === sucursalId);
        sucursalesConExtintoresVencen.push({
          sucursalId,
          sucursalNombre: sucursal?.nombre || sucursalId,
          fechaVencimiento: fechaMasRecienteStr || (fechaMasReciente ? fechaMasReciente.toLocaleDateString('es-AR') : 'N/A')
        });
      }
    });

    return sucursalesConExtintoresVencen;
  }, [mediciones, sucursales]);

  // Función para obtener sucursales con incumplimientos
  const getSucursalesConIncumplimiento = (type: 'pat' | 'iluminacion' | 'ruido') => {
    const sucursalesSet = new Set<string>();
    
    mediciones.forEach((m) => {
      const datos = m.datos as Record<string, unknown>;
      const getValue = (k: string) => String((datos[k] ?? '') as any);
      
      let incumplimientoValue = '';
      if (type === 'pat') {
        incumplimientoValue = getValue('INCUMPLIMIENTO PAT');
      } else if (type === 'iluminacion') {
        incumplimientoValue = getValue('INCUMPLIMIENTO ILUM');
      } else if (type === 'ruido') {
        incumplimientoValue = getValue('INCUMPLIMIENTO RUIDO');
      }
      
      if (incumplimientoValue === 'NO CUMPLE' && m.sucursalId) {
        sucursalesSet.add(m.sucursalId);
      }
    });
    
    const sucursalesList = Array.from(sucursalesSet).map(sucursalId => {
      const sucursal = sucursales.find(s => s.id === sucursalId);
      return {
        sucursalId,
        sucursalNombre: sucursal?.nombre || sucursalId
      };
    });
    
    return sucursalesList;
  };

  const handleIncumplimientoCardClick = (type: 'pat' | 'iluminacion' | 'ruido') => {
    setSelectedIncumplimientoType(type);
    const sucursalesList = getSucursalesConIncumplimiento(type);
    setSucursalesConIncumplimiento(sucursalesList);
    setShowIncumplimientoModal(true);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!empresaAsignadaNombre) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No hay empresa asignada</h1>
          <p className="text-gray-600">Por favor, contacte a un administrador para asignar una empresa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:h-screen flex flex-col md:flex-row md:overflow-hidden bg-gray-100">
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex md:flex-shrink-0 transition-all duration-300 ${isDesktopSidebarCollapsed ? 'w-20' : 'w-52'}`}>
        <div className="flex flex-col w-full">
          <Sidebar 
            collapsed={isDesktopSidebarCollapsed}
            onToggle={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
          />
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ease-linear duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          <div className="relative flex flex-col max-w-xs w-full h-full bg-white transform transition ease-in-out duration-300 translate-x-0">
            <div className="absolute top-0 right-0 -mr-12 pt-2 z-10">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <span className="text-white">✕</span>
              </button>
            </div>

            <Sidebar isMobile onCloseMobileMenu={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-col flex-1 md:overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="w-full bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
              className="hidden md:flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label={isDesktopSidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12" />
              </svg>
            </button>

            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Abrir menú"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Breadcrumb */}
            <div className="ml-2 md:ml-0">
              <Breadcrumb />
            </div>
          </div>

          {/* Right side of top bar */}
          <div className="flex items-center space-x-4">
            {/* User menu could go here */}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className='p-4 sm:p-6 lg:p-8 bg-white min-h-full'>
            <div className='mb-4'>
              <h3 className="text-2xl font-semibold text-gray-900">
                Dashboard - {empresaAsignadaNombre}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Gestione y visualice los datos de su empresa
              </p>
            </div>

            {/* Cards de métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
              {/* Nueva tarjeta de extintores que vencen */}
              <div 
                className="bg-gradient-to-b from-red-900 to-red-700 rounded-3xl p-6 text-white border border-red-800 shadow-sm cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setShowExtintoresModal(true)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-200 text-sm">Extintores vencen mes siguiente</p>
                    {loadingMediciones ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-16"></div>
                      </div>
                    ) : (
                      <p className="text-3xl font-bold text-white">{extintoresVencenMesSiguiente.length}</p>
                    )}
                  </div>
                  <div className="text-red-300">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div 
                className="bg-gradient-to-b from-black to-gray-700 rounded-3xl p-6 text-white border border-gray-800 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleIncumplimientoCardClick('pat')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Incumplimientos PAT</p>
                    {loadingMediciones ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-16"></div>
                      </div>
                    ) : (
                      <p className="text-3xl font-bold text-white">{incumplimientosCountsEmpresa.patNoCumple}</p>
                    )}
                  </div>
                  <div className="text-gray-400">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div 
                className="bg-gradient-to-b from-black to-gray-700  rounded-3xl p-6 text-white border border-gray-800 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleIncumplimientoCardClick('iluminacion')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Incumplimientos Iluminación</p>
                    {loadingMediciones ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-16"></div>
                      </div>
                    ) : (
                      <p className="text-3xl font-bold text-white">{incumplimientosCountsEmpresa.iluNoCumple}</p>
                    )}
                  </div>
                  <div className="text-gray-400">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div 
                className="bg-gradient-to-b from-black to-gray-700  rounded-3xl p-6 text-white border border-gray-800 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleIncumplimientoCardClick('ruido')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Incumplimientos Ruido</p>
                    {loadingMediciones ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-16"></div>
                      </div>
                    ) : (
                      <p className="text-3xl font-bold text-white">{incumplimientosCountsEmpresa.ruidoNoCumple}</p>
                    )}
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
                    <p className="text-gray-300 text-sm">Total Mediciones</p>
                    {loadingMediciones ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-16"></div>
                      </div>
                    ) : (
                      <p className="text-3xl font-bold text-white">{mediciones.length}</p>
                    )}
                  </div>
                  <div className="text-gray-400">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico de Estados de Mediciones por Tipo de Estudio */}
            <div className="mb-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Incumplimientos por Tipo de Estudio - {empresaAsignadaNombre}</h4>
                  <span className="text-xs text-gray-400">Esta empresa</span>
                </div>
                
                {loadingMediciones ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-[350px] bg-gray-100 rounded" />
                  </div>
                ) : (
                  (() => {
                    const chartData = [
                      {
                        name: "INC. PAT",
                        "CUMPLE": incumplimientosCountsForChart.pat.cumple,
                        "NO CUMPLE": incumplimientosCountsForChart.pat.noCumple
                      },
                      {
                        name: "INC. ILUM",
                        "CUMPLE": incumplimientosCountsForChart.iluminacion.cumple,
                        "NO CUMPLE": incumplimientosCountsForChart.iluminacion.noCumple
                      },
                      {
                        name: "INC. RUIDO",
                        "CUMPLE": incumplimientosCountsForChart.ruido.cumple,
                        "NO CUMPLE": incumplimientosCountsForChart.ruido.noCumple
                      },
                      {
                        name: "INC. TERMOG.",
                        "CUMPLE": incumplimientosCountsForChart.termografia.cumple,
                        "NO CUMPLE": incumplimientosCountsForChart.termografia.noCumple
                      },
                      {
                        name: "CARGA TÉRMICA",
                        "CUMPLE": incumplimientosCountsForChart.cargaTermica.cumple,
                        "NO CUMPLE": incumplimientosCountsForChart.cargaTermica.noCumple
                      },
                      {
                        name: "INF. PRUEBA DISYUNTORES",
                        "CUMPLE": incumplimientosCountsForChart.informePruebaDinamicaDisyuntores.cumple,
                        "NO CUMPLE": incumplimientosCountsForChart.informePruebaDinamicaDisyuntores.noCumple
                      }
                    ];

                    const chartConfig = {
                      "CUMPLE": {
                        label: "CUMPLE",
                        color: "rgba(34, 197, 94, 0.4)"
                      },
                      "NO CUMPLE": {
                        label: "NO CUMPLE",
                        color: "rgba(239, 68, 68, 0.4)"
                      }
                    };

                    return (
                      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                        <div className="min-w-[600px] sm:min-w-0">
                          <ChartContainer config={chartConfig} className="h-[250px] sm:h-[350px] text-black w-full">
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis
                                dataKey="name"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tick={{ fontSize: 8 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12 }}
                                label={{ value: 'Cantidad de Mediciones', angle: -90, position: 'insideLeft' }}
                              />
                              <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent />}
                              />
                              <Bar dataKey="CUMPLE" fill="rgb(34, 197, 94)" radius={4} />
                              <Bar dataKey="NO CUMPLE" fill="rgba(239, 68, 68, 0.97)" radius={4} />
                            </BarChart>
                          </ChartContainer>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* OneDrive Folders */}
            <div className="mb-6">
              <OneDriveFolders empresaNombre={empresaAsignadaNombre} filterByEmpresa={true} />
            </div>
          </div>
        </main>
      </div>

      {/* Modal de extintores que vencen */}
      {showExtintoresModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity z-40" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowExtintoresModal(false)}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Extintores que vencen el mes siguiente
                  </h3>
                  <button
                    onClick={() => setShowExtintoresModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {extintoresVencenMesSiguiente.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No hay extintores que venzan el mes siguiente.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {extintoresVencenMesSiguiente.map((item, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{item.sucursalNombre}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Fecha de vencimiento: {item.fechaVencimiento}
                            </p>
                          </div>
                          <div className="text-red-500">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowExtintoresModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de incumplimientos por sucursal */}
      {showIncumplimientoModal && selectedIncumplimientoType && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity z-40" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => {
                setShowIncumplimientoModal(false);
                setSelectedIncumplimientoType(null);
                setSucursalesConIncumplimiento([]);
              }}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Incumplimientos {selectedIncumplimientoType === 'pat' ? 'PAT' : selectedIncumplimientoType === 'iluminacion' ? 'Iluminación' : 'Ruido'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowIncumplimientoModal(false);
                      setSelectedIncumplimientoType(null);
                      setSucursalesConIncumplimiento([]);
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {sucursalesConIncumplimiento.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No hay sucursales con incumplimientos de este tipo.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sucursalesConIncumplimiento.map((item) => (
                      <div
                        key={item.sucursalId}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{item.sucursalNombre}</p>
                          </div>
                          <div className="text-red-500">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    setShowIncumplimientoModal(false);
                    setSelectedIncumplimientoType(null);
                    setSucursalesConIncumplimiento([]);
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
