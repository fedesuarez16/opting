'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useMediciones } from '@/hooks/useMediciones';
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
  
  const { empresas } = useEmpresas();
  const empresa = empresas.find(e => e.id === empresaIdFromUser);
  const empresaId = empresa?.id || empresaIdFromUser || undefined;
  const empresaAsignadaNombre = empresa?.nombre;
  const { mediciones, loading: loadingMediciones } = useMediciones(empresaId);

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
      
      const incumplimientoILU = getValue('INCUMPLIMIENTO ILU');
      if (incumplimientoILU === 'NO CUMPLE') counts.iluNoCumple += 1;
      
      const incumplimientoRUIDO = getValue('INCUMPLIMIENTO RUIDO');
      if (incumplimientoRUIDO === 'NO CUMPLE') counts.ruidoNoCumple += 1;
    });

    console.log('Incumplimientos counts para empresa:', empresaId, counts);
    return counts;
  }, [mediciones, empresaId]);

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
      
      // PAT (PUESTA A TIERRA)
      const patValue = getValue('PUESTA A TIERRA');
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
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex md:flex-shrink-0 transition-all duration-300 ${isDesktopSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex flex-col w-full">
          <Sidebar 
            collapsed={isDesktopSidebarCollapsed}
            onToggle={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
          />
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className="fixed inset-0 flex z-40">
          <div
            className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ease-linear duration-300 ${
              isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          <div
            className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transform transition ease-in-out duration-300 ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="absolute top-0 right-0 -mr-12 pt-2">
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
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
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
          <div className='p-8 bg-white min-h-full'>
            <div className='mb-4'>
              <h3 className="text-2xl font-semibold text-gray-900">
                Dashboard - {empresaAsignadaNombre}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Gestione y visualice los datos de su empresa
              </p>
            </div>

            {/* Cards de métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-b from-black to-gray-700 rounded-3xl p-6 text-white border border-gray-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm"> Estudios PAT</p>
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

              <div className="bg-gradient-to-b from-black to-gray-700  rounded-3xl p-6 text-white border border-gray-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm"> Estudios iluminación</p>
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

              <div className="bg-gradient-to-b from-black to-gray-700  rounded-3xl p-6 text-white border border-gray-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">  Estudios ruido</p>
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
                  <h4 className="text-lg font-medium text-gray-900">Estados de Mediciones por Tipo de Estudio (Cantidad de Mediciones) - {empresaAsignadaNombre}</h4>
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
                        name: "PAT",
                        "PENDIENTE": medicionesCountsEmpresa.pat.pendienteVisita,
                        "PEDIR A TEC": medicionesCountsEmpresa.pat.pedirTecnico,
                        "Procesar": medicionesCountsEmpresa.pat.procesar,
                        "En nube": medicionesCountsEmpresa.pat.enNube
                      },
                      {
                        name: "Iluminación",
                        "PENDIENTE": medicionesCountsEmpresa.iluminacion.pendienteVisita,
                        "PEDIR A TEC": medicionesCountsEmpresa.iluminacion.pedirTecnico,
                        "Procesar": medicionesCountsEmpresa.iluminacion.procesar,
                        "En nube": medicionesCountsEmpresa.iluminacion.enNube
                      },
                      {
                        name: "Ruido",
                        "PENDIENTE": medicionesCountsEmpresa.ruido.pendienteVisita,
                        "PEDIR A TEC": medicionesCountsEmpresa.ruido.pedirTecnico,
                        "Procesar": medicionesCountsEmpresa.ruido.procesar,
                        "En nube": medicionesCountsEmpresa.ruido.enNube
                      },
                      {
                        name: "Carga Térmica",
                        "PENDIENTE": medicionesCountsEmpresa.cargaTermica.pendienteVisita,
                        "PEDIR A TEC": medicionesCountsEmpresa.cargaTermica.pedirTecnico,
                        "Procesar": medicionesCountsEmpresa.cargaTermica.procesar,
                        "En nube": medicionesCountsEmpresa.cargaTermica.enNube
                      },
                      {
                        name: "ESTUDIO TERMOGRAFÍA",
                        "PENDIENTE": medicionesCountsEmpresa.termografia.pendienteVisita,
                        "PEDIR A TEC": medicionesCountsEmpresa.termografia.pedirTecnico,
                        "Procesar": medicionesCountsEmpresa.termografia.procesar,
                        "En nube": medicionesCountsEmpresa.termografia.enNube
                      }
                    ];

                    const chartConfig = {
                      "PENDIENTE": {
                        label: "PENDIENTE",
                        color: "#ef4444"
                      },
                      "PEDIR A TEC": {
                        label: "PEDIR A TEC",
                        color: "#f59e0b"
                      },
                      "Procesar": {
                        label: "PROCESAR",
                        color: "#3b82f6"
                      },
                      "En nube": {
                        label: "EN NUBE",
                        color: "#22c55e"
                      }
                    };

                    return (
                      <ChartContainer config={chartConfig} className="h-[350px] text-black w-full">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="name"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tick={{ fontSize: 12 }}
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
                          <Bar dataKey="PENDIENTE" fill="#ef4444" radius={4} />
                          <Bar dataKey="PEDIR A TEC" fill="#f59e0b" radius={4} />
                          <Bar dataKey="Procesar" fill="#3b82f6" radius={4} />
                          <Bar dataKey="En nube" fill="#22c55e" radius={4} />
                        </BarChart>
                      </ChartContainer>
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
    </div>
  );
}
