'use client';

import { useState, use, useEffect, useMemo } from 'react';
import { useSucursales, Sucursal } from '@/hooks/useSucursales';
import { useEmpresas } from '@/hooks/useEmpresas';
import Link from 'next/link';
import { useMediciones } from '@/hooks/useMediciones';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import OneDriveFolders from '@/components/OneDriveFolders';

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

  // Conteos de mediciones por tipo de estudio para esta empresa específica
  const medicionesCountsEmpresa = useMemo(() => {
    const isArcosDorados = empresaId === 'ARCOS DORADOS' || empresa?.nombre === 'ARCOS DORADOS';
    
    const counts: any = {
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

    // Agregar estudios adicionales solo para ARCOS DORADOS
    if (isArcosDorados) {
      counts.pruebaDinamicaDisyuntores = {
        pendienteVisita: 0,
        pedirTecnico: 0,
        procesar: 0,
        enNube: 0
      };
      counts.termografiaTableros = {
        pendienteVisita: 0,
        pedirTecnico: 0,
        procesar: 0,
        enNube: 0
      };
    }

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
      
      // PRUEBA DINAMICA DE DISYUNTORES (solo para ARCOS DORADOS)
      if (isArcosDorados && counts.pruebaDinamicaDisyuntores) {
        const pruebaDinamicaValue = getValue('PRUEBA DINAMICA DE DISYUNTORES');
        if (pruebaDinamicaValue === 'PENDIENTE') counts.pruebaDinamicaDisyuntores.pendienteVisita += 1;
        else if (pruebaDinamicaValue === 'PEDIR A TEC') counts.pruebaDinamicaDisyuntores.pedirTecnico += 1;
        else if (pruebaDinamicaValue === 'PROCESAR') counts.pruebaDinamicaDisyuntores.procesar += 1;
        else if (pruebaDinamicaValue === 'EN NUBE') counts.pruebaDinamicaDisyuntores.enNube += 1;
      }
      
      // TERMOGRAFIA EN TABLEROS (solo para ARCOS DORADOS)
      if (isArcosDorados && counts.termografiaTableros) {
        const termografiaTablerosValue = getValue('TERMOGRAFIA EN TABLEROS');
        if (termografiaTablerosValue === 'PENDIENTE') counts.termografiaTableros.pendienteVisita += 1;
        else if (termografiaTablerosValue === 'PEDIR A TEC') counts.termografiaTableros.pedirTecnico += 1;
        else if (termografiaTablerosValue === 'PROCESAR') counts.termografiaTableros.procesar += 1;
        else if (termografiaTablerosValue === 'EN NUBE') counts.termografiaTableros.enNube += 1;
      }
    });

    console.log('Mediciones counts para empresa:', empresaId, counts);
    return counts;
  }, [mediciones, empresaId, empresa]);

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

  const _handleAddEdit = (sucursal: Sucursal | null) => {
    setCurrentSucursal(sucursal);
    setShowModal(true);
  };

  const _handleDelete = (sucursalId: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta sucursal?')) {
      deleteSucursal(empresaId, sucursalId).catch(error => {
        console.error('Error al eliminar sucursal:', error);
        alert('Error al eliminar la sucursal');
      });
    }
  };

  if (loading) {
    return (
      <div className='p-8 bg-white'>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-200 rounded-3xl p-6 h-32 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="h-[350px] bg-gray-100 rounded animate-pulse" />
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
    <div className='p-8 bg-white' >
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
            <p className="text-gray-300 text-sm">Incumplimiento de Estudios PAT</p>
            {loadingMediciones ? (
              <div className="h-8 bg-gray-300 rounded w-16 animate-pulse"></div>
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
            <p className="text-gray-300 text-sm">Incumplimiento de Estudios iluminación</p>
            {loadingMediciones ? (
              <div className="h-8 bg-gray-300 rounded w-16 animate-pulse"></div>
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
            <p className="text-gray-300 text-sm">Incumplimiento de Estudios ruido</p>
            {loadingMediciones ? (
              <div className="h-8 bg-gray-300 rounded w-16 animate-pulse"></div>
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
    </div>

      

      {/* Gráfico de Estados de Mediciones por Tipo de Estudio */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">Estados de Mediciones por Tipo de Estudio (Cantidad de Mediciones) - {empresa?.nombre || 'Empresa'}</h4>
            <span className="text-xs text-gray-400">Esta empresa</span>
        </div>
        
          {loadingMediciones ? (
            <div className="h-[350px] bg-gray-100 rounded animate-pulse" />
          ) : (
            (() => {
              const isArcosDorados = empresaId === 'ARCOS DORADOS' || empresa?.nombre === 'ARCOS DORADOS';
              
              const chartData = [
                {
                  name: "PAT",
                  "En nube": medicionesCountsEmpresa.pat.enNube,
                  "Procesar": medicionesCountsEmpresa.pat.procesar,
                  "PEDIR A TEC": medicionesCountsEmpresa.pat.pedirTecnico,
                  "PENDIENTE": medicionesCountsEmpresa.pat.pendienteVisita
                },
                {
                  name: "Iluminación",
                  "En nube": medicionesCountsEmpresa.iluminacion.enNube,
                  "Procesar": medicionesCountsEmpresa.iluminacion.procesar,
                  "PEDIR A TEC": medicionesCountsEmpresa.iluminacion.pedirTecnico,
                  "PENDIENTE": medicionesCountsEmpresa.iluminacion.pendienteVisita
                },
                {
                  name: "Ruido",
                  "En nube": medicionesCountsEmpresa.ruido.enNube,
                  "Procesar": medicionesCountsEmpresa.ruido.procesar,
                  "PEDIR A TEC": medicionesCountsEmpresa.ruido.pedirTecnico,
                  "PENDIENTE": medicionesCountsEmpresa.ruido.pendienteVisita
                },
                {
                  name: "Carga Térmica",
                  "En nube": medicionesCountsEmpresa.cargaTermica.enNube,
                  "Procesar": medicionesCountsEmpresa.cargaTermica.procesar,
                  "PEDIR A TEC": medicionesCountsEmpresa.cargaTermica.pedirTecnico,
                  "PENDIENTE": medicionesCountsEmpresa.cargaTermica.pendienteVisita
                },
                {
                  name: "ESTUDIO TERMOGRAFÍA",
                  "En nube": medicionesCountsEmpresa.termografia.enNube,
                  "Procesar": medicionesCountsEmpresa.termografia.procesar,
                  "PEDIR A TEC": medicionesCountsEmpresa.termografia.pedirTecnico,
                  "PENDIENTE": medicionesCountsEmpresa.termografia.pendienteVisita
                }
              ];

              // Agregar estudios adicionales solo para ARCOS DORADOS
              if (isArcosDorados && (medicionesCountsEmpresa as any).pruebaDinamicaDisyuntores) {
                chartData.push({
                  name: "PRUEBA  DISYUNTORES",
                  "En nube": (medicionesCountsEmpresa as any).pruebaDinamicaDisyuntores.enNube,
                  "Procesar": (medicionesCountsEmpresa as any).pruebaDinamicaDisyuntores.procesar,
                  "PEDIR A TEC": (medicionesCountsEmpresa as any).pruebaDinamicaDisyuntores.pedirTecnico,
                  "PENDIENTE": (medicionesCountsEmpresa as any).pruebaDinamicaDisyuntores.pendienteVisita
                });
              }

              if (isArcosDorados && (medicionesCountsEmpresa as any).termografiaTableros) {
                chartData.push({
                  name: "TERMOGRAFIA ",
                  "En nube": (medicionesCountsEmpresa as any).termografiaTableros.enNube,
                  "Procesar": (medicionesCountsEmpresa as any).termografiaTableros.procesar,
                  "PEDIR A TEC": (medicionesCountsEmpresa as any).termografiaTableros.pedirTecnico,
                  "PENDIENTE": (medicionesCountsEmpresa as any).termografiaTableros.pendienteVisita
                });
              }

              const chartConfig = {
                "En nube": {
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
                   <Bar dataKey="En nube" fill="rgba(3, 160, 61, 0.67)" radius={4} />
                    <Bar dataKey="Procesar" fill="rgba(4, 68, 171, 0.67)" radius={4} />
                    <Bar dataKey="PEDIR A TEC" fill="rgba(152, 97, 3, 0.67)" radius={4} />
                    <Bar dataKey="PENDIENTE" fill="rgba(151, 5, 5, 0.67)" radius={4} />
                  </BarChart>
                </ChartContainer>
              );
            })()
          )}
          </div>
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

      {/* OneDrive Folders */}
      {empresa?.nombre && (
        <OneDriveFolders empresaId={empresaId} empresaNombre={empresa.nombre} filterByEmpresa={true} />
      )}

     

      {/* Tabla de sucursales con estilos shadcn
      <div className="w-full">
        <div className="rounded-md border border-gray-200 shadow-md">
          <div className="px-6 py-4 border-b bg-gray-50 border-gray-100 text-gray-500">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sucursales</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{filteredSucursales.length} sucursales</span>
                <button type="button" className="p-2 rounded hover:bg-gray-100">
                  <svg className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {filteredSucursales.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-gray-600">
              <div className="text-center">
                <p className="text-lg font-medium">No se encontraron sucursales</p>
                <p className="text-sm">Las sucursales aparecerán aquí una vez que se agreguen al sistema.</p>
              </div>
            </div>
          ) : (
            <div className="relative text-gray-500 overflow-x-auto">
              <table className="w-full text-gray-500 caption-bottom text-sm">
                <thead className=" border-gray-200">
                  <tr className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0">
                      Sucursal
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0">
                      Mediciones
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0">
                      Email
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0">
                      Teléfono
                    </th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredSucursales.map((sucursal) => (
                    <tr
                      key={sucursal.id}
                      className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                    >
                      <td className="p-4 align-middle font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {sucursal.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{sucursal.nombre}</div>
                            <div className="text-sm text-gray-600">
                              {sucursal.direccion || 'Sin dirección'}
                            </div>
                            {sucursal.categorias && sucursal.categorias.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {sucursal.categorias.map((cat) => (
                                  <span key={cat} className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        {loadingMediciones ? (
                          <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-12"></div>
                          </div>
                        ) : (
                          <div className="text-sm">
                            {medicionesEnNubePorSucursal[sucursal.id]?.length > 0 ? (
                              <div className="text-xs text-gray-600">
                                Última: {medicionesEnNubePorSucursal[sucursal.id][0]?.fecha || 'N/A'}
                              </div>
                            ) : (
                              <span className="text-gray-600">Sin mediciones</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        {sucursal.email || (
                          <span className="text-gray-600">No disponible</span>
                        )}
                      </td>
                      <td className="p-4 align-middle font-mono text-sm">
                        {sucursal.telefono || (
                          <span className="text-gray-600">No disponible</span>
                        )}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <Link
                          href={`/dashboard/empresas/${resolvedParams.id}/sucursales/${encodeURIComponent(sucursal.id)}`}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-gray-300 hover:bg-gray-50 hover:text-gray-900 h-9 px-3"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div> 

       */}

    
       
    </div>
  );
}

interface SucursalFormModalProps {
  sucursal: Sucursal | null;
  empresaId: string;
  onClose: () => void;
  onSave: (data: Partial<Sucursal>) => void;
}

function SucursalFormModal({ sucursal, empresaId: _empresaId, onClose, onSave }: SucursalFormModalProps) {
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