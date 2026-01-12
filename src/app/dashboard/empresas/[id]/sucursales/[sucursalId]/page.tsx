'use client';

import { useState, use, useMemo, useEffect } from 'react';
import { useMediciones, Medicion } from '@/hooks/useMediciones';
import { useSucursales } from '@/hooks/useSucursales';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import Link from 'next/link';
import { storage, firestore } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import SucursalOneDriveFiles from '@/components/SucursalOneDriveFiles';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type UserRole = 'admin' | 'general_manager' | 'branch_manager';

interface SucursalDetailPageProps {
  params: Promise<{
    id: string;
    sucursalId: string;
  }>;
}

export default function SucursalDetailPage({ params }: SucursalDetailPageProps) {
  const resolvedParams = use(params);
  const empresaId = decodeURIComponent(resolvedParams.id);
  const sucursalId = decodeURIComponent(resolvedParams.sucursalId);
  
  const { user } = useAuth();
  const { mediciones, loading: loadingMediciones, error: errorMediciones } = useMediciones(empresaId, sucursalId);
  const { sucursales } = useSucursales(empresaId);
  const { empresas } = useEmpresas();
  
  const empresa = empresas.find(e => e.id === empresaId);
  const sucursal = sucursales.find(s => s.id === sucursalId);
  
  const [search, setSearch] = useState('');
  const [selectedMedicion, setSelectedMedicion] = useState<Medicion | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedOk, setUploadedOk] = useState<boolean>(false);
  const [archivos, setArchivos] = useState<Array<{ id: string; nombre: string; tipo?: string; tamano?: number; url: string; fechaSubida?: unknown }>>([]);
  const [loadingArchivos, setLoadingArchivos] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Obtener el rol del usuario
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userRef = ref(database, `users/${user.uid}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setUserRole(userData.role);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
    };

    fetchUserRole();
  }, [user]);

  const fetchArchivos = async () => {
    try {
      setLoadingArchivos(true);
      const sucursalRef = doc(firestore, 'empresas', empresaId, 'sucursales', sucursalId);
      const q = query(collection(sucursalRef, 'archivos'), orderBy('fechaSubida', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          nombre: (data.nombre as string) || 'Sin nombre',
          tipo: data.tipo as string,
          tamano: data.tamano as number,
          url: (data.url as string) || '',
          fechaSubida: data.fechaSubida
        };
      });
      setArchivos(list);
    } catch (e) {
      console.error('Error al cargar archivos:', e);
    } finally {
      setLoadingArchivos(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setUploadedOk(false);
    try {
      const storagePath = `empresas/${empresaId}/sucursales/${sucursalId}/archivos/${Date.now()}-${file.name}`;
      const fileRef = ref(storage, storagePath);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      // Guardar metadata en subcolección archivos
      const sucursalRef = doc(firestore, 'empresas', empresaId, 'sucursales', sucursalId);
      await addDoc(collection(sucursalRef, 'archivos'), {
        nombre: file.name,
        tipo: file.type,
        tamano: file.size,
        url,
        path: storagePath,
        fechaSubida: new Date(),
      });
      setUploadedOk(true);
      fetchArchivos();
    } catch (err: any) {
      console.error('Error al subir archivo:', err);
      setUploadError('Error al subir archivo');
    } finally {
      setUploading(false);
      // clean input value so the same file can trigger again
      if (e.target) e.target.value = '' as any;
    }
  };

  // Debug
  console.log('SucursalDetailPage - EmpresaId:', empresaId);
  console.log('SucursalDetailPage - SucursalId:', sucursalId);
  console.log('SucursalDetailPage - Empresa:', empresa);
  console.log('SucursalDetailPage - Sucursal:', sucursal);
  console.log('SucursalDetailPage - Mediciones:', mediciones);

  // Cargar archivos al montar
  useState(() => { fetchArchivos(); });

  const filteredMediciones = mediciones.filter(medicion => 
    medicion.fecha.toLowerCase().includes(search.toLowerCase()) ||
    (medicion.datos.TÉCNICOS && typeof medicion.datos.TÉCNICOS === 'string' && medicion.datos.TÉCNICOS.toLowerCase().includes(search.toLowerCase())) ||
    (medicion.datos.SERVICIO && typeof medicion.datos.SERVICIO === 'string' && medicion.datos.SERVICIO.toLowerCase().includes(search.toLowerCase()))
  );

  // Totales de KPI para ESTA sucursal
  const _kpis = (() => {
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
  })();

  // Conteos de mediciones por tipo de estudio para esta sucursal específica
  const medicionesCountsSucursal = useMemo(() => {
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
      const termoValue = getValue('ESTUDIO TERMOGRAFÍA');
      if (termoValue === 'PENDIENTE') counts.termografia.pendienteVisita += 1;
      else if (termoValue === 'PEDIR A TEC') counts.termografia.pedirTecnico += 1;
      else if (termoValue === 'PROCESAR') counts.termografia.procesar += 1;
      else if (termoValue === 'EN NUBE') counts.termografia.enNube += 1;
    });

    console.log('Mediciones counts para sucursal:', sucursalId, counts);
    return counts;
  }, [mediciones, sucursalId]);

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
      const incumplimientoTERMO = getValue('INCUMPLIMIENTOS TERMOGRAFÍA') || getValue('INCUMPLIMIENTO TERMOGRAFIA');
      if (incumplimientoTERMO === 'CUMPLE') counts.termografia.cumple += 1;
      else if (incumplimientoTERMO === 'NO CUMPLE') counts.termografia.noCumple += 1;
    });

    return counts;
  }, [mediciones]);

  if (loadingMediciones) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (errorMediciones) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {errorMediciones}</span>
      </div>
    );
  }

  return (
    <div className='p-8 bg-white'>
     

      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-2xl font-semibold text-gray-900">
            Mediciones de {sucursal?.nombre || 'Sucursal'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {empresa?.nombre || 'Empresa'} - {filteredMediciones.length} mediciones encontradas
          </p>
        </div>
      
      </div>


     


      {/* Gráfico de Estados de Mediciones por Tipo de Estudio */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">Estados de Mediciones por Tipo de Estudio (Cantidad de Mediciones) - {sucursal?.nombre || 'Sucursal'}</h4>
            <span className="text-xs text-gray-400">Esta sucursal</span>
          </div>
          
          {loadingMediciones ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-[350px] bg-gray-100 rounded" />
            </div>
          ) : (
            (() => {
              const isManager = userRole === 'general_manager' || userRole === 'branch_manager';
              
              // Si es gerente, mostrar solo CUMPLE y NO CUMPLE
              if (isManager) {
                const chartData = [
                  {
                    name: "INCUMPLIMIENTO PAT",
                    "CUMPLE": incumplimientosCountsForChart.pat.cumple,
                    "NO CUMPLE": incumplimientosCountsForChart.pat.noCumple
                  },
                  {
                    name: "INCUMPLIMIENTO ILUM",
                    "CUMPLE": incumplimientosCountsForChart.iluminacion.cumple,
                    "NO CUMPLE": incumplimientosCountsForChart.iluminacion.noCumple
                  },
                  {
                    name: "INCUMPLIMIENTO RUIDO",
                    "CUMPLE": incumplimientosCountsForChart.ruido.cumple,
                    "NO CUMPLE": incumplimientosCountsForChart.ruido.noCumple
                  },
                  {
                    name: "INCUMPLIMIENTOS TERMOGRAFÍA",
                    "CUMPLE": incumplimientosCountsForChart.termografia.cumple,
                    "NO CUMPLE": incumplimientosCountsForChart.termografia.noCumple
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
                          tick={{ fontSize: 12 }}
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
                        <Bar dataKey="CUMPLE" fill="rgba(34, 197, 94, 0.67)" radius={4} />
                        <Bar dataKey="NO CUMPLE" fill="rgba(239, 68, 68, 0.67)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>
              );
              }

              // Para admin, mostrar estados de mediciones
              const chartData = [
                {
                  name: "PAT",
                  "PENDIENTE": medicionesCountsSucursal.pat.pendienteVisita,
                  "PEDIR A TEC": medicionesCountsSucursal.pat.pedirTecnico,
                  "Procesar": medicionesCountsSucursal.pat.procesar,
                  "En nube": medicionesCountsSucursal.pat.enNube
                },
                {
                  name: "Iluminación",
                  "PENDIENTE": medicionesCountsSucursal.iluminacion.pendienteVisita,
                  "PEDIR A TEC": medicionesCountsSucursal.iluminacion.pedirTecnico,
                  "Procesar": medicionesCountsSucursal.iluminacion.procesar,
                  "En nube": medicionesCountsSucursal.iluminacion.enNube
                },
                {
                  name: "Ruido",
                  "PENDIENTE": medicionesCountsSucursal.ruido.pendienteVisita,
                  "PEDIR A TEC": medicionesCountsSucursal.ruido.pedirTecnico,
                  "Procesar": medicionesCountsSucursal.ruido.procesar,
                  "En nube": medicionesCountsSucursal.ruido.enNube
                },
                {
                  name: "Carga Térmica",
                  "PENDIENTE": medicionesCountsSucursal.cargaTermica.pendienteVisita,
                  "PEDIR A TEC": medicionesCountsSucursal.cargaTermica.pedirTecnico,
                  "Procesar": medicionesCountsSucursal.cargaTermica.procesar,
                  "En nube": medicionesCountsSucursal.cargaTermica.enNube
                },
                {
                  name: "ESTUDIO TERMOGRAFÍA",
                  "PENDIENTE": medicionesCountsSucursal.termografia.pendienteVisita,
                  "PEDIR A TEC": medicionesCountsSucursal.termografia.pedirTecnico,
                  "Procesar": medicionesCountsSucursal.termografia.procesar,
                  "En nube": medicionesCountsSucursal.termografia.enNube
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
                          tick={{ fontSize: 12 }}
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
                        <Bar dataKey="PENDIENTE" fill="#ef4444" radius={4} />
                        <Bar dataKey="PEDIR A TEC" fill="#f59e0b" radius={4} />
                        <Bar dataKey="Procesar" fill="#3b82f6" radius={4} />
                        <Bar dataKey="En nube" fill="#22c55e" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>

     

      {/* Lista de mediciones mejorada */}
      {filteredMediciones.length === 0 ? (
        <div className="bg-gray-100 rounded-3xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
          <p className="text-lg mb-2">No se encontraron mediciones para esta sucursal.</p>
          <p className="text-sm">Las mediciones se encuentran en la subcolección de esta sucursal en Firestore.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Mediciones</h3>
              <span className="text-sm text-gray-500">{filteredMediciones.length} mediciones</span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredMediciones.map((medicion) => {
              const datos = medicion.datos as Record<string, unknown>;
              
              // Convertir valores a string de forma segura
              const cuit = datos.CUIT ? String(datos.CUIT).trim() : '';
              const telefono = datos.TELÉFONO ? String(datos.TELÉFONO).trim() : '';
              const email = datos.EMAIL ? String(datos.EMAIL).trim() : '';
              const puestaTierra = datos['PUESTA A TIERRA'] ? String(datos['PUESTA A TIERRA']).trim() : '';
              
              return (
                <div key={medicion.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    {/* Información principal */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900 truncate">
                              Medición del {medicion.fecha}
                            </h4>
                          </div>
                          
                          {/* Información clave en filas */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 font-medium min-w-[80px]">Técnico:</span>
                              <span className="text-gray-900">{String(datos.TÉCNICOS || datos.tecnico || 'No especificado')}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 font-medium min-w-[80px]">Servicio:</span>
                              <span className="text-gray-900">{String(datos.SERVICIO || datos.servicio || 'No especificado')}</span>
                            </div>

                            {cuit && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-medium min-w-[80px]">CUIT:</span>
                                <span className="text-gray-900">{cuit}</span>
                              </div>
                            )}

                            {telefono && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-medium min-w-[80px]">Teléfono:</span>
                                <span className="text-gray-900">{telefono}</span>
                              </div>
                            )}

                            {email && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-medium min-w-[80px]">Email:</span>
                                <span className="text-gray-900">{email}</span>
                              </div>
                            )}

                            {puestaTierra && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-medium min-w-[80px]">Puesta a Tierra:</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  puestaTierra.toUpperCase() === 'EN NUBE' 
                                    ? 'bg-green-100 text-green-800'
                                    : puestaTierra.toUpperCase() === 'PENDIENTE'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {puestaTierra}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botón de acción */}
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => setSelectedMedicion(medicion)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver detalles
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


       {/* Buscador */}
       <div className="mb-6 mt-6">
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
            className="bg-white h-10 block w-full pl-10 sm:text-sm rounded-md border-gray-300 ring-1 ring-gray-200 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 placeholder-gray-400"
            placeholder="Buscar mediciones por fecha, técnico o servicio..."
          />
        </div>
      </div>

      
              

      {/* Archivos de OneDrive */}
      <SucursalOneDriveFiles 
        empresaId={empresaId} 
        sucursalId={sucursalId} 
      />

      {/* Modal de detalles de medición */}
      {selectedMedicion && (
        <MedicionDetailModal
          medicion={selectedMedicion}
          onClose={() => setSelectedMedicion(null)}
        />
      )}
    </div>
  );
}

interface MedicionDetailModalProps {
  medicion: Medicion;
  onClose: () => void;
}

function MedicionDetailModal({ medicion, onClose }: MedicionDetailModalProps) {
  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-100 bg-opacity-50 transition-opacity z-40" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Detalles de Medición - {medicion.fecha}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(medicion.datos).map(([key, value]) => {
                  // Saltear campos internos de Firebase
                  if (key.startsWith('_') || key === 'fechaCreacion') return null;
                  
                  return (
                    <div key={key} className="border-b border-gray-200 pb-2">
                      <p className="text-sm font-medium text-gray-600">{key}</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {value !== null && value !== undefined ? String(value) : 'No especificado'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 