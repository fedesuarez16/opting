'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useMediciones } from '@/hooks/useMediciones';
import { useSucursales } from '@/hooks/useSucursales';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import OneDriveFolders from '@/components/OneDriveFolders';
import Sidebar from '@/components/Sidebar';
import Breadcrumb from '@/components/Breadcrumb';
import { getEstudiosAplicables } from '@/lib/servicioUtils';

export default function EmpresaGerentePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [empresaIdFromUser, setEmpresaIdFromUser] = useState<string | null>(null);
  const [userServicio, setUserServicio] = useState<string>('BLINDAJE LEGAL'); // Default
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [showExtintoresModal, setShowExtintoresModal] = useState(false);
  const [showIncumplimientoModal, setShowIncumplimientoModal] = useState(false);
  const [selectedIncumplimientoType, setSelectedIncumplimientoType] = useState<'pat' | 'iluminacion' | 'ruido' | 'pruebaDisyuntores' | null>(null);
  const [sucursalesConIncumplimiento, setSucursalesConIncumplimiento] = useState<Array<{ empresaId: string; sucursalId: string; sucursalNombre: string }>>([]);
  const [showBlindajeModal, setShowBlindajeModal] = useState(false);
  const [relevamientosConBlindaje, setRelevamientosConBlindaje] = useState<Array<{ empresaId: string; empresaNombre: string; sucursalId: string; sucursalNombre: string; fecha: string }>>([]);
  const [loadingBlindaje, setLoadingBlindaje] = useState(false);
  
  const { empresas } = useEmpresas();
  const empresa = empresas.find(e => e.id === empresaIdFromUser);
  const empresaId = empresa?.id || empresaIdFromUser || undefined;
  const empresaAsignadaNombre = empresa?.nombre;
  const { mediciones: allMediciones, loading: loadingMediciones } = useMediciones(empresaId);
  
  // Filtrar mediciones por el servicio del usuario
  const mediciones = useMemo(() => {
    if (!userServicio) return allMediciones;
    return allMediciones.filter((m) => {
      const datos = m.datos as Record<string, unknown>;
      const getValue = (k: string) => String((datos[k] ?? '') as unknown);
      const servicio = getValue('SERVICIO') || getValue('servicio');
      return servicio && servicio.toUpperCase().includes(userServicio.toUpperCase());
    });
  }, [allMediciones, userServicio]);
  
  const { sucursales } = useSucursales(empresaId);

  // Obtener qué estudios aplican según el servicio del usuario
  const estudiosAplicables = useMemo(() => getEstudiosAplicables(userServicio), [userServicio]);

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
          // Obtener el servicio del usuario (default: BLINDAJE LEGAL)
          if (userData.servicio) {
            setUserServicio(userData.servicio);
          }
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

  // Verificar si hay mediciones con servicio PRUEBA DINAMICA DISYUNTORES
  const tieneMedicionesPruebaDisyuntores = useMemo(() => {
    return allMediciones.some((m) => {
      const datos = m.datos as Record<string, unknown>;
      const getValue = (k: string) => String((datos[k] ?? '') as unknown);
      const servicio = getValue('SERVICIO') || getValue('servicio');
      return servicio && servicio.toUpperCase().includes('PRUEBA') && servicio.toUpperCase().includes('DISYUNTOR');
    });
  }, [allMediciones]);

  // Conteos de incumplimientos específicos para esta empresa
  const incumplimientosCountsEmpresa = useMemo(() => {
    const counts = {
      patNoCumple: 0,
      iluNoCumple: 0,
      ruidoNoCumple: 0,
      pruebaDisyuntoresNoCumple: 0
    };

    // Usar allMediciones para contar incumplimientos de disyuntores (no filtrado por servicio)
    allMediciones.forEach((m) => {
      const datos = m.datos as Record<string, unknown>;
      const getValue = (k: string) => String((datos[k] ?? '') as any);
      
      // INCUMPLIMIENTOS
      const incumplimientoPAT = getValue('INCUMPLIMIENTO PAT');
      if (incumplimientoPAT === 'NO CUMPLE') counts.patNoCumple += 1;
      
      const incumplimientoILU = getValue('INCUMPLIMIENTO ILUM');
      if (incumplimientoILU === 'NO CUMPLE') counts.iluNoCumple += 1;
      
      const incumplimientoRUIDO = getValue('INCUMPLIMIENTO RUIDO');
      if (incumplimientoRUIDO === 'NO CUMPLE') counts.ruidoNoCumple += 1;
      
      // INCUMPLIMIENTO PRUEBA DINAMICA DISYUNTORES (usar allMediciones)
      const incumplimientoPRUEBA = getValue('INCUMPLIMIENTO PRUEBA DINAMICA DISYUNTORES');
      if (incumplimientoPRUEBA === 'NO CUMPLE') counts.pruebaDisyuntoresNoCumple += 1;
    });

    console.log('Incumplimientos counts para empresa:', empresaId, counts);
    return counts;
  }, [allMediciones, empresaId]);

  // Conteos de incumplimientos para el gráfico (solo CUMPLE y NO CUMPLE)
  // Usar allMediciones para todos los estudios para evitar duplicados
  const incumplimientosCountsForChart = useMemo(() => {
    const counts = {
      pat: {
        cumple: 0,
        noCumple: 0,
        enProceso: 0
      },
      iluminacion: {
        cumple: 0,
        noCumple: 0,
        enProceso: 0
      },
      ruido: {
        cumple: 0,
        noCumple: 0,
        enProceso: 0
      },
      termografia: {
        cumple: 0,
        noCumple: 0,
        enProceso: 0
      },
      cargaTermica: {
        cumple: 0,
        noCumple: 0,
        enProceso: 0
      },
      informePruebaDinamicaDisyuntores: {
        cumple: 0,
        noCumple: 0,
        enProceso: 0
      }
    };

    // Usar allMediciones para contar todos los incumplimientos (no filtrado por servicio)
    // Esto asegura que los datos del gráfico coincidan con las cards
    allMediciones.forEach((m) => {
      const datos = m.datos as Record<string, unknown>;
      const getValue = (k: string) => String((datos[k] ?? '') as any).trim();
      
      // INCUMPLIMIENTO PAT
      const incumplimientoPAT = getValue('INCUMPLIMIENTO PAT');
      if (incumplimientoPAT === 'CUMPLE') counts.pat.cumple += 1;
      else if (incumplimientoPAT === 'NO CUMPLE') counts.pat.noCumple += 1;
      else if (incumplimientoPAT && incumplimientoPAT !== 'NO APLICA') counts.pat.enProceso += 1;
      
      // INCUMPLIMIENTO ILUM
      const incumplimientoILU = getValue('INCUMPLIMIENTO ILUM');
      if (incumplimientoILU === 'CUMPLE') counts.iluminacion.cumple += 1;
      else if (incumplimientoILU === 'NO CUMPLE') counts.iluminacion.noCumple += 1;
      else if (incumplimientoILU && incumplimientoILU !== 'NO APLICA') counts.iluminacion.enProceso += 1;
      
      // INCUMPLIMIENTO RUIDO
      const incumplimientoRUIDO = getValue('INCUMPLIMIENTO RUIDO');
      if (incumplimientoRUIDO === 'CUMPLE') counts.ruido.cumple += 1;
      else if (incumplimientoRUIDO === 'NO CUMPLE') counts.ruido.noCumple += 1;
      else if (incumplimientoRUIDO && incumplimientoRUIDO !== 'NO APLICA') counts.ruido.enProceso += 1;
      
      // INCUMPLIMIENTOS TERMOGRAFÍA
      const incumplimientoTERMO = getValue('INCUMPLIMIENTOS TERMOGRAFÍA') || getValue('INCUMPLIMIENTO TERMOGRAFIA');
      if (incumplimientoTERMO === 'CUMPLE') counts.termografia.cumple += 1;
      else if (incumplimientoTERMO === 'NO CUMPLE') counts.termografia.noCumple += 1;
      else if (incumplimientoTERMO && incumplimientoTERMO !== 'NO APLICA') counts.termografia.enProceso += 1;
      
      // INCUMPLIMIENTO CARGA TÉRMICA
      const incumplimientoCARGA = getValue('INCUMPLIMIENTO CARGA TERMICA') || getValue('INCUMPLIENTO CARGA TERMICA') || getValue('INCUMPLIMIENTO CARGA TÉRMICA');
      if (incumplimientoCARGA === 'CUMPLE') counts.cargaTermica.cumple += 1;
      else if (incumplimientoCARGA === 'NO CUMPLE') counts.cargaTermica.noCumple += 1;
      else if (incumplimientoCARGA && incumplimientoCARGA !== 'NO APLICA') counts.cargaTermica.enProceso += 1;
      
      // INCUMPLIMIENTO PRUEBA DINAMICA DISYUNTORES
      const incumplimientoPRUEBA = getValue('INCUMPLIMIENTO PRUEBA DINAMICA DISYUNTORES');
      if (incumplimientoPRUEBA === 'CUMPLE') counts.informePruebaDinamicaDisyuntores.cumple += 1;
      else if (incumplimientoPRUEBA === 'NO CUMPLE') counts.informePruebaDinamicaDisyuntores.noCumple += 1;
      else if (incumplimientoPRUEBA && incumplimientoPRUEBA !== 'NO APLICA') counts.informePruebaDinamicaDisyuntores.enProceso += 1;
    });

    return counts;
  }, [allMediciones]);

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

  // Calcular cantidad de sucursales únicas con servicio BLINDAJE LEGAL
  const sucursalesConBlindajeLegal = useMemo(() => {
    if (!empresaId) return 0;
    
    const sucursalesSet = new Set<string>();
    
    mediciones.forEach((m) => {
      const datos = m.datos as Record<string, unknown>;
      const getValue = (k: string) => String((datos[k] ?? '') as unknown);
      
      const servicio = getValue('SERVICIO') || getValue('servicio');
      const clienteId = getValue('CLIENTE');
      
      // Verificar si contiene el servicio del usuario y pertenece a la empresa asignada
      if (servicio && servicio.toUpperCase().includes(userServicio.toUpperCase()) && clienteId === empresaId) {
        const sucursalId = getValue('SUCURSAL');
        if (sucursalId) {
          sucursalesSet.add(sucursalId);
        }
      }
    });
    
    return sucursalesSet.size;
  }, [mediciones, empresaId, userServicio]);

  // Función helper para formatear el porcentaje (quitar 0 inicial si existe)
  const formatearPorcentaje = (valor: number | null): string | null => {
    if (valor === null || isNaN(valor)) return null;
    
    // Si el valor es < 1 (tiene 0 inicial), quitar el 0 y mostrar el resto
    if (valor < 1 && valor > 0) {
      // Multiplicar por 100 y redondear
      return Math.round(valor * 100).toString();
    }
    
    // Si es >= 1, mostrar tal cual (redondeado)
    return Math.round(valor).toString();
  };

  // Calcular el índice de cobertura legal general (promedio de todas las sucursales)
  const indiceCoberturaLegalGeneral = useMemo(() => {
    if (allMediciones.length === 0) return null;
    
    // Agrupar mediciones por sucursal y obtener el valor más reciente de cada una
    const valoresPorSucursal = new Map<string, number>();
    
    allMediciones.forEach((m) => {
      const datos = m.datos as Record<string, unknown>;
      const getValue = (k: string) => String((datos[k] ?? '') as any).trim();
      
      const coberturaValue = getValue('PORCENTAJE DE COBERTURA LEGAL');
      
      if (coberturaValue && coberturaValue !== '' && coberturaValue !== 'undefined' && coberturaValue !== 'null') {
        // Intentar convertir a número
        const numValue = parseFloat(coberturaValue.replace('%', '').replace(',', '.'));
        
        if (!isNaN(numValue) && m.sucursalId) {
          // Si ya existe un valor para esta sucursal, mantener el más reciente (o el mayor, según prefieras)
          const existingValue = valoresPorSucursal.get(m.sucursalId);
          if (existingValue === undefined || numValue > existingValue) {
            valoresPorSucursal.set(m.sucursalId, numValue);
          }
        }
      }
    });
    
    // Calcular el promedio
    if (valoresPorSucursal.size === 0) return null;
    
    const valores = Array.from(valoresPorSucursal.values());
    const promedio = valores.reduce((sum, val) => sum + val, 0) / valores.length;
    
    return formatearPorcentaje(promedio);
  }, [allMediciones]);

  // Calcular Extintores vencidos / próximos a vencer (próximos 30 días)
  const extintoresVencenMesSiguiente = useMemo(() => {
    const ahora = new Date();
    // Resetear a inicio del día para comparaciones precisas
    ahora.setHours(0, 0, 0, 0);
    // Calcular fecha dentro de 30 días
    const proximos30Dias = new Date(ahora);
    proximos30Dias.setDate(proximos30Dias.getDate() + 30);
    proximos30Dias.setHours(23, 59, 59, 999);
    
    const sucursalesConExtintoresVencen: Array<{
      empresaId: string;
      sucursalId: string;
      sucursalNombre: string;
      fechaVencimiento: string;
      estaVencido: boolean;
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
            fecha.setHours(0, 0, 0, 0);
            if (!isNaN(fecha.getTime())) {
              if (fechaMasReciente === null || fecha.getTime() > fechaMasReciente.getTime()) {
                fechaMasReciente = fecha;
                fechaMasRecienteStr = fechaExtintoresValue;
              }
            }
          } catch (e) {
            // Ignorar errores de parsing
          }
        }
      });

      // Verificar si la fecha está vencida o vence en los próximos 30 días
      if (fechaMasReciente) {
        const fecha = fechaMasReciente as Date;
        const fechaTime = fecha.getTime();
        const ahoraTime = ahora.getTime();
        const proximos30DiasTime = proximos30Dias.getTime();
        
        const estaVencido = fechaTime < ahoraTime;
        const venceProximos30Dias = fechaTime >= ahoraTime && fechaTime <= proximos30DiasTime;
        
        if (estaVencido || venceProximos30Dias) {
          const sucursal = sucursales.find(s => s.id === sucursalId);
          const fechaVencimientoStr = fechaMasRecienteStr || fecha.toLocaleDateString('es-AR');
          sucursalesConExtintoresVencen.push({
            empresaId: empresaId || '',
            sucursalId,
            sucursalNombre: sucursal?.nombre || sucursalId,
            fechaVencimiento: fechaVencimientoStr,
            estaVencido
          });
        }
      }
    });

    return sucursalesConExtintoresVencen;
  }, [mediciones, sucursales, empresaId]);

  // Función para obtener sucursales con incumplimientos
  const getSucursalesConIncumplimiento = (type: 'pat' | 'iluminacion' | 'ruido' | 'pruebaDisyuntores') => {
    const sucursalesSet = new Set<string>();
    
    // Para pruebaDisyuntores, usar allMediciones (no filtrado por servicio)
    const medicionesAUsar = type === 'pruebaDisyuntores' ? allMediciones : mediciones;
    
    medicionesAUsar.forEach((m) => {
      const datos = m.datos as Record<string, unknown>;
      const getValue = (k: string) => String((datos[k] ?? '') as any);
      
      let incumplimientoValue = '';
      if (type === 'pat') {
        incumplimientoValue = getValue('INCUMPLIMIENTO PAT');
      } else if (type === 'iluminacion') {
        incumplimientoValue = getValue('INCUMPLIMIENTO ILUM');
      } else if (type === 'ruido') {
        incumplimientoValue = getValue('INCUMPLIMIENTO RUIDO');
      } else if (type === 'pruebaDisyuntores') {
        incumplimientoValue = getValue('INCUMPLIMIENTO PRUEBA DINAMICA DISYUNTORES');
      }
      
      if (incumplimientoValue === 'NO CUMPLE' && m.sucursalId) {
        sucursalesSet.add(m.sucursalId);
      }
    });
    
    const sucursalesList = Array.from(sucursalesSet).map(sucursalId => {
      const sucursal = sucursales.find(s => s.id === sucursalId);
      return {
        empresaId: empresaId || '',
        sucursalId,
        sucursalNombre: sucursal?.nombre || sucursalId
      };
    });
    
    return sucursalesList;
  };

  const handleIncumplimientoCardClick = (type: 'pat' | 'iluminacion' | 'ruido' | 'pruebaDisyuntores') => {
    setSelectedIncumplimientoType(type);
    const sucursalesList = getSucursalesConIncumplimiento(type);
    setSucursalesConIncumplimiento(sucursalesList);
    setShowIncumplimientoModal(true);
  };

  // Función para obtener relevamientos con servicio BLINDAJE LEGAL de la empresa asignada
  const fetchRelevamientosConBlindaje = async () => {
    if (!empresaId) return;
    
    setLoadingBlindaje(true);
    try {
      const medicionesQuery = collectionGroup(firestore, 'mediciones');
      const medicionesSnapshot = await getDocs(medicionesQuery);
      
      const relevamientosList: Array<{ empresaId: string; empresaNombre: string; sucursalId: string; sucursalNombre: string; fecha: string }> = [];
      
      medicionesSnapshot.forEach((doc) => {
        const datos = doc.data() as Record<string, unknown>;
        const getValue = (k: string) => String((datos[k] ?? '') as unknown);
        
        // Obtener el servicio y verificar que pertenezca a la empresa asignada
        const servicio = getValue('SERVICIO') || getValue('servicio');
        const clienteId = getValue('CLIENTE');
        
        // Verificar si contiene el servicio del usuario y pertenece a la empresa asignada
        if (servicio && servicio.toUpperCase().includes(userServicio.toUpperCase()) && clienteId === empresaId) {
          const sucursalId = getValue('SUCURSAL');
          const fecha = getValue('FECHAS DE MEDICIÓN') || getValue('FECHA DE MEDICIÓN') || getValue('fecha') || 'No especificada';
          
          if (sucursalId) {
            const sucursal = sucursales.find(s => s.id === sucursalId);
            relevamientosList.push({
              empresaId: empresaId,
              empresaNombre: empresaAsignadaNombre || empresaId,
              sucursalId,
              sucursalNombre: sucursal?.nombre || sucursalId,
              fecha
            });
          }
        }
      });
      
      // Ordenar por sucursal y fecha
      relevamientosList.sort((a, b) => {
        if (a.sucursalNombre !== b.sucursalNombre) {
          return a.sucursalNombre.localeCompare(b.sucursalNombre);
        }
        return b.fecha.localeCompare(a.fecha); // Más reciente primero
      });
      
      setRelevamientosConBlindaje(relevamientosList);
    } catch (error) {
      console.error('Error al obtener relevamientos con BLINDAJE LEGAL:', error);
    } finally {
      setLoadingBlindaje(false);
    }
  };

  const handleTotalMedicionesClick = () => {
    setShowBlindajeModal(true);
    fetchRelevamientosConBlindaje();
  };

  if (authLoading || loading || !empresaAsignadaNombre) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
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
          <div className="flex items-center space-x-2">
            {/* Soporte Técnico */}
            <a
              href="mailto:lelopez@optingsha.com.ar"
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-200 rounded-md transition-colors"
              title="Soporte Técnico: lelopez@optingsha.com.ar"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs text-gray-600 font-medium hidden sm:inline">Soporte Técnico</span>
            </a>

            {/* Soporte Comercial WhatsApp */}
            <a
              href="https://wa.me/541123312054"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-200 rounded-md transition-colors relative group"
              title="Soporte Comercial WhatsApp: 11 2331 2054"
            >
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span className="text-xs text-black font-medium hidden sm:inline">Soporte Comercial WA</span>
            </a>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className='p-4 sm:p-6 lg:p-10 bg-white min-h-full relative'>
            {/* Botón flotante de WhatsApp - Soporte Comercial (esquina inferior derecha) */}
            <a
              href="https://wa.me/541123312054"
              target="_blank"
              rel="noopener noreferrer"
              className="fixed right-4 bottom-6 z-50 inline-flex items-center gap-2 px-3 py-3 bg-[#25D366] text-white rounded-full shadow-lg hover:bg-[#20BA5A] transition-all hover:shadow-xl hover:scale-105 active:scale-95"
              title="Soporte Comercial WhatsApp"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </a>
            <div className='mb-4'>
              <h3 className="text-2xl font-semibold text-gray-900">
                Dashboard - {empresaAsignadaNombre}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Gestione y visualice los datos de su empresa
              </p>
            </div>

            {/* Cards de métricas */}
            <div 
              className="grid gap-2 mb-8 w-full"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
              }}
            >
              {/* Card de Índice de Cobertura Legal General - Primera posición - Solo visible para BLINDAJE LEGAL */}
              {userServicio.toUpperCase().includes('BLINDAJE LEGAL') && (
              <div 
                className="bg-gradient-to-b from-black to-gray-700 rounded-3xl p-6 text-white border border-gray-800 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Índice de Cobertura Legal General</p>
                    {loadingMediciones ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-16"></div>
                      </div>
                    ) : (
                      <p className="text-3xl font-bold text-white">
                        {indiceCoberturaLegalGeneral !== null ? `${indiceCoberturaLegalGeneral}%` : 'N/A'}
                      </p>
                    )}
                  </div>
                  <div className="text-gray-400">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
              )}

              {/* Card de Total Locales Relevados */}
              <div 
                className="bg-gradient-to-b from-black to-gray-700 rounded-3xl p-6 text-white border border-gray-800 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleTotalMedicionesClick}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Total Locales Relevados</p>
                    {loadingMediciones ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-16"></div>
                      </div>
                    ) : (
                      <p className="text-3xl font-bold text-white">{sucursalesConBlindajeLegal}</p>
                    )}
                  </div>
                  <div className="text-gray-400">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
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
                className={`bg-gradient-to-b from-black to-gray-700 rounded-3xl p-6 text-white border border-gray-800 shadow-sm ${!estudiosAplicables.iluminacion ? '' : 'cursor-pointer hover:opacity-90 transition-opacity'}`}
                onClick={() => estudiosAplicables.iluminacion && handleIncumplimientoCardClick('iluminacion')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Incumplimientos Iluminación</p>
                    {loadingMediciones ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-16"></div>
                      </div>
                    ) : (
                      <p className={`font-bold text-white ${!estudiosAplicables.iluminacion ? 'text-xl' : 'text-3xl'}`}>
                        {!estudiosAplicables.iluminacion ? 'NO APLICA' : incumplimientosCountsEmpresa.iluNoCumple}
                      </p>
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
                className={`bg-gradient-to-b from-black to-gray-700 rounded-3xl p-6 text-white border border-gray-800 shadow-sm ${!estudiosAplicables.ruido ? '' : 'cursor-pointer hover:opacity-90 transition-opacity'}`}
                onClick={() => estudiosAplicables.ruido && handleIncumplimientoCardClick('ruido')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Incumplimientos Ruido</p>
                    {loadingMediciones ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-16"></div>
                      </div>
                    ) : (
                      <p className={`font-bold text-white ${!estudiosAplicables.ruido ? 'text-xl' : 'text-3xl'}`}>
                        {!estudiosAplicables.ruido ? 'NO APLICA' : incumplimientosCountsEmpresa.ruidoNoCumple}
                      </p>
                    )}
                  </div>
                  <div className="text-gray-400">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Card de Incumplimientos Prueba Disyuntores - Solo visible si hay mediciones con ese servicio Y el estudio aplica */}
              {tieneMedicionesPruebaDisyuntores && estudiosAplicables.pruebaDisyuntores && (
                <div 
                  className="bg-gradient-to-b from-black to-gray-700 rounded-3xl p-6 text-white border border-gray-800 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleIncumplimientoCardClick('pruebaDisyuntores')}
                >
                <div className="flex items-center justify-between">
                  <div>
                      <p className="text-gray-300 text-sm">Incumplimientos Prueba Disyuntores</p>
                    {loadingMediciones ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-16"></div>
                      </div>
                    ) : (
                        <p className="text-3xl font-bold text-white">
                          {incumplimientosCountsEmpresa.pruebaDisyuntoresNoCumple}
                        </p>
                    )}
                  </div>
                  <div className="text-gray-400">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                </div>
              </div>
              )}

              {/* Nueva tarjeta de extintores que vencen - Segunda posición */}
              <div 
                className={`rounded-3xl p-6 text-white border shadow-sm ${
                  !estudiosAplicables.extintores 
                    ? '' 
                    : 'cursor-pointer hover:shadow-lg transition-shadow'
                } ${
                  !estudiosAplicables.extintores
                    ? 'bg-gradient-to-b from-black to-gray-700 border-gray-800'
                    : extintoresVencenMesSiguiente.length > 0
                    ? 'bg-gradient-to-b from-red-900 to-red-700 border-red-800'
                    : 'bg-gradient-to-b from-black to-gray-700 border-gray-800'
                }`}
                onClick={() => estudiosAplicables.extintores && setShowExtintoresModal(true)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${extintoresVencenMesSiguiente.length > 0 && estudiosAplicables.extintores ? 'text-gray-200' : 'text-gray-300'}`}>
                      Extintores vencidos / próximos a vencer
                    </p>
                    {loadingMediciones ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-300 rounded w-16"></div>
                      </div>
                    ) : (
                      <p className={`font-bold text-white ${!estudiosAplicables.extintores ? 'text-xl' : 'text-3xl'}`}>
                        {!estudiosAplicables.extintores ? 'NO APLICA' : extintoresVencenMesSiguiente.length}
                      </p>
                    )}
                  </div>
                  <div className={extintoresVencenMesSiguiente.length > 0 && estudiosAplicables.extintores ? 'text-red-300' : 'text-gray-400'}>
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
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
                </div>
                
                {loadingMediciones ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-[350px] bg-gray-100 rounded" />
                  </div>
                ) : (
                  (() => {
                    const chartData = [
                      {
                        name: "EST. PAT",
                        "CUMPLE": estudiosAplicables.pat ? incumplimientosCountsForChart.pat.cumple : null,
                        "NO CUMPLE": estudiosAplicables.pat ? incumplimientosCountsForChart.pat.noCumple : null,
                        "EN PROCESO": estudiosAplicables.pat ? incumplimientosCountsForChart.pat.enProceso : null,
                        "NO APLICA": estudiosAplicables.pat ? null : 1
                      },
                      {
                        name: "EST. ILU",
                        "CUMPLE": estudiosAplicables.iluminacion ? incumplimientosCountsForChart.iluminacion.cumple : null,
                        "NO CUMPLE": estudiosAplicables.iluminacion ? incumplimientosCountsForChart.iluminacion.noCumple : null,
                        "EN PROCESO": estudiosAplicables.iluminacion ? incumplimientosCountsForChart.iluminacion.enProceso : null,
                        "NO APLICA": estudiosAplicables.iluminacion ? null : 1
                      },
                      {
                        name: "EST. RUIDO",
                        "CUMPLE": estudiosAplicables.ruido ? incumplimientosCountsForChart.ruido.cumple : null,
                        "NO CUMPLE": estudiosAplicables.ruido ? incumplimientosCountsForChart.ruido.noCumple : null,
                        "EN PROCESO": estudiosAplicables.ruido ? incumplimientosCountsForChart.ruido.enProceso : null,
                        "NO APLICA": estudiosAplicables.ruido ? null : 1
                      },
                      {
                        name: "EST. TERMOG.",
                        "CUMPLE": estudiosAplicables.termografia ? incumplimientosCountsForChart.termografia.cumple : null,
                        "NO CUMPLE": estudiosAplicables.termografia ? incumplimientosCountsForChart.termografia.noCumple : null,
                        "EN PROCESO": estudiosAplicables.termografia ? incumplimientosCountsForChart.termografia.enProceso : null,
                        "NO APLICA": estudiosAplicables.termografia ? null : 1
                      },
                      {
                        name: "EST. CARGA TÉRMICA",
                        "CUMPLE": estudiosAplicables.cargaTermica ? incumplimientosCountsForChart.cargaTermica.cumple : null,
                        "NO CUMPLE": estudiosAplicables.cargaTermica ? incumplimientosCountsForChart.cargaTermica.noCumple : null,
                        "EN PROCESO": estudiosAplicables.cargaTermica ? incumplimientosCountsForChart.cargaTermica.enProceso : null,
                        "NO APLICA": estudiosAplicables.cargaTermica ? null : 1
                      },
                      // Solo incluir Prueba Disyuntores si aplica y hay datos
                      ...(estudiosAplicables.pruebaDisyuntores && tieneMedicionesPruebaDisyuntores && (incumplimientosCountsForChart.informePruebaDinamicaDisyuntores.cumple > 0 || incumplimientosCountsForChart.informePruebaDinamicaDisyuntores.noCumple > 0 || incumplimientosCountsForChart.informePruebaDinamicaDisyuntores.enProceso > 0) ? [{
                        name: "EST. PRUEBA DISYUNTORES",
                        "CUMPLE": incumplimientosCountsForChart.informePruebaDinamicaDisyuntores.cumple,
                        "NO CUMPLE": incumplimientosCountsForChart.informePruebaDinamicaDisyuntores.noCumple,
                        "EN PROCESO": incumplimientosCountsForChart.informePruebaDinamicaDisyuntores.enProceso,
                        "NO APLICA": null
                      }] : [])
                    ];

                    const chartConfig = {
                      "CUMPLE": {
                        label: "CUMPLE",
                        color: "rgba(34, 197, 94, 0.4)"
                      },
                      "NO CUMPLE": {
                        label: "NO CUMPLE",
                        color: "rgba(239, 68, 68, 0.4)"
                      },
                      "EN PROCESO": {
                        label: "EN PROCESO",
                        color: "rgba(59, 130, 246, 0.4)"
                      },
                      "NO APLICA": {
                        label: "NO APLICA",
                        color: "rgba(156, 163, 175, 0.4)"
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
                            allowDecimals={false}
                          />
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                          />
                              <Bar dataKey="CUMPLE" fill="rgb(34, 197, 94)" radius={4} />
                              <Bar dataKey="NO CUMPLE" fill="rgba(239, 68, 68, 0.97)" radius={4} />
                              <Bar dataKey="EN PROCESO" fill="rgba(59, 130, 246, 0.67)" radius={4} />
                              <Bar dataKey="NO APLICA" fill="rgba(156, 163, 175, 0.6)" radius={4} />
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
              <OneDriveFolders empresaId={empresaId} empresaNombre={empresaAsignadaNombre} filterByEmpresa={true} />
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
                    Extintores vencidos y próximos a vencer
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
                    <p className="text-gray-500">No hay extintores vencidos ni próximos a vencer.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {extintoresVencenMesSiguiente.map((item, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                          item.estaVencido ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{item.sucursalNombre}</p>
                              {item.estaVencido && (
                                <span className="px-2 py-0.5 text-xs font-semibold bg-red-600 text-white rounded">
                                  VENCIDO
                                </span>
                              )}
                              {!item.estaVencido && (
                                <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-600 text-white rounded">
                                  PRÓXIMO A VENCER
                                </span>
                              )}
                            </div>
                            <p className={`text-sm mt-1 ${item.estaVencido ? 'text-red-700' : 'text-yellow-700'}`}>
                              Fecha de vencimiento: {item.fechaVencimiento}
                            </p>
                          </div>
                          <Link
                            href={`/dashboard/empresas/${encodeURIComponent(item.empresaId)}/sucursales/${encodeURIComponent(item.sucursalId)}`}
                            className="ml-4 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex-shrink-0"
                            onClick={() => setShowExtintoresModal(false)}
                          >
                            Ver detalle
                          </Link>
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
                    Incumplimientos {selectedIncumplimientoType === 'pat' ? 'PAT' : selectedIncumplimientoType === 'iluminacion' ? 'Iluminación' : selectedIncumplimientoType === 'ruido' ? 'Ruido' : 'Prueba Disyuntores'}
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
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.sucursalNombre}</p>
                          </div>
                          <Link
                            href={`/dashboard/empresas/${encodeURIComponent(item.empresaId)}/sucursales/${encodeURIComponent(item.sucursalId)}`}
                            className="ml-4 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex-shrink-0"
                            onClick={() => {
                              setShowIncumplimientoModal(false);
                              setSelectedIncumplimientoType(null);
                              setSucursalesConIncumplimiento([]);
                            }}
                          >
                            Ver detalle
                          </Link>
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

      {/* Modal de relevamientos con BLINDAJE LEGAL */}
      {showBlindajeModal && (
        <BlindajeLegalModal
          relevamientos={relevamientosConBlindaje}
          loading={loadingBlindaje}
          onClose={() => {
            setShowBlindajeModal(false);
            setRelevamientosConBlindaje([]);
          }}
        />
      )}
    </div>
  );
}

interface BlindajeLegalModalProps {
  relevamientos: Array<{ empresaId: string; empresaNombre: string; sucursalId: string; sucursalNombre: string; fecha: string }>;
  loading: boolean;
  onClose: () => void;
}

function BlindajeLegalModal({ relevamientos, loading, onClose }: BlindajeLegalModalProps) {
  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity z-40" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Relevamientos
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
            ) : relevamientos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No se encontraron relevamientos con servicio BLINDAJE LEGAL.</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="space-y-3">
                  {relevamientos.map((relevamiento, index) => (
                    <div
                      key={`${relevamiento.empresaId}_${relevamiento.sucursalId}_${index}`}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-medium text-gray-900 truncate">
                          {relevamiento.sucursalNombre}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {relevamiento.empresaNombre}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="text-sm bg-green-100 border border-green-300 opacity-80 w-fit p-2 rounded-md text-center text-white">
                          <div className="text-sm text-black font-semibold">{relevamiento.fecha}</div>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/empresas/${encodeURIComponent(relevamiento.empresaId)}/sucursales/${encodeURIComponent(relevamiento.sucursalId)}`}
                        className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex-shrink-0 text-center sm:text-left"
                        onClick={onClose}
                      >
                        Ver detalle
                      </Link>
                    </div>
                  ))}
                </div>
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
