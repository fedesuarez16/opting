'use client';

import { useState, use, useEffect, useMemo } from 'react';
import { useSucursales, Sucursal } from '@/hooks/useSucursales';
import { useEmpresas } from '@/hooks/useEmpresas';
import Link from 'next/link';
import { useMediciones } from '@/hooks/useMediciones';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import OneDriveFolders from '@/components/OneDriveFolders';

type UserRole = 'admin' | 'general_manager' | 'branch_manager';

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
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userServicio, setUserServicio] = useState<string>('BLINDAJE LEGAL'); // Default
  
  // Obtener el rol y servicio del usuario
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userRef = ref(database, `users/${user.uid}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setUserRole(userData.role);
            // Obtener el servicio del usuario (default: BLINDAJE LEGAL)
            if (userData.servicio) {
              setUserServicio(userData.servicio);
            }
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
    };

    fetchUserRole();
  }, [user]);
  
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
  const [showPendienteModal, setShowPendienteModal] = useState(false);
  const [selectedStudyType, setSelectedStudyType] = useState<'pat' | 'iluminacion' | 'ruido' | 'pruebaDisyuntores' | null>(null);
  const [sucursalesConPendiente, setSucursalesConPendiente] = useState<Array<{ sucursalId: string; sucursalNombre: string }>>([]);
  const [showExtintoresModal, setShowExtintoresModal] = useState(false);

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
      
      const patValue = getValue('PAT');
      if (patValue === 'EN NUBE') puestaTierra += 1;
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
      if (getValue('INCUMPLIMIENTO ILUM') === 'CUMPLE') incumplimientoILU += 1;
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
      const patValue = up('PAT');
      if (patValue === 'EN NUBE') puesta += 1;
      if (up('INFORME DE VISITA') === 'EN NUBE') informe += 1;
      if (up('INCUMPLIMIENTO') === 'PENDIENTE') incumpl += 1;
      if (up('REGISTRO DE EXTINTORES') === 'EN NUBE') extintores += 1;
    });
    return { puesta, informe, incumpl, extintores };
  }, [mediciones]);

  // Calcular extintores próximos a vencer (próximos 30 días) y obtener la fecha más próxima
  const extintoresProximosAVencer = useMemo(() => {
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);
    const proximos30Dias = new Date(ahora);
    proximos30Dias.setDate(proximos30Dias.getDate() + 30);
    proximos30Dias.setHours(23, 59, 59, 999);
    
    const extintoresList: Array<{
      sucursalId: string;
      sucursalNombre: string;
      fechaVencimiento: string;
      fechaVencimientoDate: Date;
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

    // Para cada sucursal, obtener la fecha más próxima a vencer
    medicionesPorSucursal.forEach((medicionesSucursal, sucursalId) => {
      let fechaMasProxima: Date | null = null;
      let fechaMasProximaStr: string | null = null;

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
              // Solo considerar fechas que están vencidas o vencen en los próximos 30 días
              const fechaTime = fecha.getTime();
              const ahoraTime = ahora.getTime();
              const proximos30DiasTime = proximos30Dias.getTime();
              
              const estaVencido = fechaTime < ahoraTime;
              const venceProximos30Dias = fechaTime >= ahoraTime && fechaTime <= proximos30DiasTime;
              
              if (estaVencido || venceProximos30Dias) {
                if (fechaMasProxima === null || fechaTime < fechaMasProxima.getTime()) {
                  fechaMasProxima = fecha;
                  fechaMasProximaStr = fechaExtintoresValue;
                }
              }
            }
          } catch (e) {
            // Ignorar errores de parsing
          }
        }
      });

      if (fechaMasProxima) {
        const sucursal = sucursales.find(s => s.id === sucursalId);
        const fecha = fechaMasProxima as Date;
        const fechaTime = fecha.getTime();
        const ahoraTime = ahora.getTime();
        const estaVencido = fechaTime < ahoraTime;
        
        extintoresList.push({
          sucursalId,
          sucursalNombre: sucursal?.nombre || sucursalId,
          fechaVencimiento: fechaMasProximaStr || fecha.toLocaleDateString('es-AR'),
          fechaVencimientoDate: fecha,
          estaVencido
        });
      }
    });

    // Ordenar por fecha de vencimiento (más próximas primero)
    extintoresList.sort((a, b) => a.fechaVencimientoDate.getTime() - b.fechaVencimientoDate.getTime());

    return extintoresList;
  }, [mediciones, sucursales]);

  // Obtener la fecha más próxima a vencer para mostrar en la card
  const fechaExtintoresMasProxima = useMemo(() => {
    if (extintoresProximosAVencer.length === 0) return null;
    return extintoresProximosAVencer[0].fechaVencimiento;
  }, [extintoresProximosAVencer]);

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
      },
      informePruebaDinamicaDisyuntores: {
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
      
      // PAT
      const patValue = getValue('PAT');
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
      const termoValue = getValue('TERMOGRAFIA');
      if (termoValue === 'PENDIENTE') counts.termografia.pendienteVisita += 1;
      else if (termoValue === 'PEDIR A TEC') counts.termografia.pedirTecnico += 1;
      else if (termoValue === 'PROCESAR') counts.termografia.procesar += 1;
      else if (termoValue === 'EN NUBE') counts.termografia.enNube += 1;
      
      // INFORME PRUEBA DINAMICA DISYUNTORES (siempre disponible)
      const informePruebaDinamicaValue = getValue('INFORME PRUEBA DINAMICA DISYUNTORES') || getValue('PRUEBA DINAMICA DE DISYUNTORES');
      if (informePruebaDinamicaValue === 'PENDIENTE') counts.informePruebaDinamicaDisyuntores.pendienteVisita += 1;
      else if (informePruebaDinamicaValue === 'PEDIR A TEC') counts.informePruebaDinamicaDisyuntores.pedirTecnico += 1;
      else if (informePruebaDinamicaValue === 'PROCESAR') counts.informePruebaDinamicaDisyuntores.procesar += 1;
      else if (informePruebaDinamicaValue === 'EN NUBE') counts.informePruebaDinamicaDisyuntores.enNube += 1;
      
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
    if (mediciones.length === 0) return null;
    
    // Agrupar mediciones por sucursal y obtener el valor más reciente de cada una
    const valoresPorSucursal = new Map<string, number>();
    
    mediciones.forEach((m) => {
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
  }, [mediciones]);

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

  // Pendiente de Entrega para admin (todos los estados que NO son "EN NUBE")
  const pendienteEntregaCounts = useMemo(() => {
    return {
      pat: medicionesCountsEmpresa.pat.pendienteVisita + 
           medicionesCountsEmpresa.pat.pedirTecnico + 
           medicionesCountsEmpresa.pat.procesar,
      iluminacion: medicionesCountsEmpresa.iluminacion.pendienteVisita + 
                  medicionesCountsEmpresa.iluminacion.pedirTecnico + 
                  medicionesCountsEmpresa.iluminacion.procesar,
      ruido: medicionesCountsEmpresa.ruido.pendienteVisita + 
             medicionesCountsEmpresa.ruido.pedirTecnico + 
             medicionesCountsEmpresa.ruido.procesar,
      pruebaDisyuntores: (medicionesCountsEmpresa as any).informePruebaDinamicaDisyuntores 
        ? (medicionesCountsEmpresa as any).informePruebaDinamicaDisyuntores.pendienteVisita + 
          (medicionesCountsEmpresa as any).informePruebaDinamicaDisyuntores.pedirTecnico + 
          (medicionesCountsEmpresa as any).informePruebaDinamicaDisyuntores.procesar
        : 0
    };
  }, [medicionesCountsEmpresa]);

  // Función para obtener sucursales con estudios pendientes
  const getSucursalesConPendiente = (studyType: 'pat' | 'iluminacion' | 'ruido' | 'pruebaDisyuntores') => {
    const sucursalesSet = new Set<string>();
    const sucursalesMap = new Map<string, string>(); // sucursalId -> sucursalNombre
    
    mediciones.forEach((m) => {
      const datos = m.datos as Record<string, unknown>;
      const getValue = (k: string) => String((datos[k] ?? '') as any);
      
      let studyValue = '';
      if (studyType === 'pat') {
        studyValue = getValue('PAT');
      } else if (studyType === 'iluminacion') {
        studyValue = getValue('ILUMINACIÓN') || getValue('ILUMINACION');
      } else if (studyType === 'ruido') {
        studyValue = getValue('RUIDO');
      } else if (studyType === 'pruebaDisyuntores') {
        studyValue = getValue('INFORME PRUEBA DINAMICA DISYUNTORES') || getValue('PRUEBA DINAMICA DE DISYUNTORES');
      }
      
      // Verificar si está pendiente (no en nube)
      if (studyValue === 'PENDIENTE' || studyValue === 'PEDIR A TEC' || studyValue === 'PROCESAR') {
        const sucursalId = m.sucursalId;
        if (sucursalId) {
          sucursalesSet.add(sucursalId);
          // Obtener nombre de sucursal
          const sucursal = sucursales.find(s => s.id === sucursalId);
          if (sucursal && !sucursalesMap.has(sucursalId)) {
            sucursalesMap.set(sucursalId, sucursal.nombre);
          }
        }
      }
    });
    
    const sucursalesList = Array.from(sucursalesSet).map(sucursalId => ({
      sucursalId,
      sucursalNombre: sucursalesMap.get(sucursalId) || sucursalId
    }));
    
    return sucursalesList;
  };

  const handlePendienteCardClick = (studyType: 'pat' | 'iluminacion' | 'ruido' | 'pruebaDisyuntores') => {
    if (userRole !== 'admin') return;
    
    setSelectedStudyType(studyType);
    const sucursalesList = getSucursalesConPendiente(studyType);
    setSucursalesConPendiente(sucursalesList);
    setShowPendienteModal(true);
  };
  
  // Verificar si el servicio del usuario es "prueba dinamica de disyuntores"
  const isPruebaDisyuntores = useMemo(() => {
    return userServicio.toUpperCase().includes('PRUEBA') && 
           userServicio.toUpperCase().includes('DISYUNTOR');
  }, [userServicio]);

  // Conteos de incumplimientos por tipo para el gráfico (para gerentes)
  const incumplimientosCountsForChart = useMemo(() => {
    const isArcosDorados = empresaId === 'ARCOS DORADOS' || empresa?.nombre === 'ARCOS DORADOS';
    
    const counts: any = {
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
      }
    };

    mediciones.forEach((m) => {
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
      
      // INCUMPLIMIENTOS TERMOGRAFÍA (si existe el campo)
      const incumplimientoTERMO = getValue('INCUMPLIMIENTOS TERMOGRAFÍA') || getValue('INCUMPLIMIENTO TERMOGRAFIA');
      if (incumplimientoTERMO === 'CUMPLE') counts.termografia.cumple += 1;
      else if (incumplimientoTERMO === 'NO CUMPLE') counts.termografia.noCumple += 1;
      else if (incumplimientoTERMO && incumplimientoTERMO !== 'NO APLICA') counts.termografia.enProceso += 1;
    });

    console.log('Incumplimientos counts para gráfico:', empresaId, counts);
    return counts;
  }, [mediciones, empresaId, empresa]);

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
    <div className='p-4 sm:p-6 lg:p-8 bg-white' >
      <div className='mb-4'>
          <div className="flex items-center">
            <Link href="/dashboard/empresas" className="mr-2 text-gray-600 hover:text-gray-900 flex-shrink-0">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
              Sucursales de {empresa?.nombre || 'Empresa'}
            </h3>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Gestione las sucursales de esta empresa
          </p>
        </div>

         {/* Cards de métricas */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isPruebaDisyuntores ? 'lg:grid-cols-7' : 'lg:grid-cols-6'} gap-4 sm:gap-6 mb-6 sm:mb-8`}>
      
      {/* Card de Índice de Cobertura Legal General - Primera posición */}
      <div className="bg-gradient-to-b from-black to-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white border border-gray-800 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-gray-300 text-xs sm:text-sm truncate">Índice de Cobertura Legal General</p>
            {loadingMediciones ? (
              <div className="h-6 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 animate-pulse mt-1"></div>
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                {indiceCoberturaLegalGeneral !== null ? `${indiceCoberturaLegalGeneral}%` : 'N/A'}
              </p>
            )}
          </div>
          <div className="text-gray-400 flex-shrink-0 ml-2">
            <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-b from-black to-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white border border-gray-800 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-gray-300 text-xs sm:text-sm truncate">Total sucursales</p>
            {loading ? (
              <div className="h-6 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 animate-pulse mt-1"></div>
            ) : (
              <p className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">{sucursales.length}</p>
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
        className={`bg-gradient-to-b from-black to-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white border border-gray-800 shadow-sm ${userRole === 'admin' ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        onClick={() => userRole === 'admin' && handlePendienteCardClick('pat')}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-gray-300 text-xs sm:text-sm truncate">
              {userRole === 'admin' ? 'PAT Pendiente de Entrega ' : 'Incumplimiento PAT'}
            </p>
            {loadingMediciones ? (
              <div className="h-6 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 animate-pulse mt-1"></div>
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                {userRole === 'admin' 
                  ? pendienteEntregaCounts.pat 
                  : incumplimientosCountsEmpresa.patNoCumple}
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
        className={`bg-gradient-to-b from-black to-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white border border-gray-800 shadow-sm ${userRole === 'admin' ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        onClick={() => userRole === 'admin' && handlePendienteCardClick('iluminacion')}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-gray-300 text-xs sm:text-sm truncate">
              {userRole === 'admin' ? ' Ilu pendiente de Entrega ' : 'Incumplimiento Iluminación'}
            </p>
            {loadingMediciones ? (
              <div className="h-6 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 animate-pulse mt-1"></div>
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                {userRole === 'admin' 
                  ? pendienteEntregaCounts.iluminacion 
                  : incumplimientosCountsEmpresa.iluNoCumple}
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
        className={`bg-gradient-to-b from-black to-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white border border-gray-800 shadow-sm ${userRole === 'admin' ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        onClick={() => userRole === 'admin' && handlePendienteCardClick('ruido')}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-gray-300 text-xs sm:text-sm truncate">
              {userRole === 'admin' ? 'Ruido Pendiente de Entrega' : 'Incumplimiento Ruido'}
            </p>
            {loadingMediciones ? (
              <div className="h-6 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 animate-pulse mt-1"></div>
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                {userRole === 'admin' 
                  ? pendienteEntregaCounts.ruido 
                  : incumplimientosCountsEmpresa.ruidoNoCumple}
              </p>
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
        className={`bg-gradient-to-b from-black to-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white border border-gray-800 shadow-sm ${extintoresProximosAVencer.length > 0 ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        onClick={() => extintoresProximosAVencer.length > 0 && setShowExtintoresModal(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-gray-300 text-xs sm:text-sm truncate">Fecha extintores próximos a vencer</p>
            {loadingMediciones ? (
              <div className="h-6 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 animate-pulse mt-1"></div>
            ) : (
              <p className="text-base sm:text-lg font-bold text-white mt-1">
                {fechaExtintoresMasProxima ? (() => {
                  try {
                    const fecha = new Date(fechaExtintoresMasProxima);
                    if (!isNaN(fecha.getTime())) {
                      return fecha.toLocaleDateString('es-AR', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      });
                    }
                    return fechaExtintoresMasProxima;
                  } catch {
                    return fechaExtintoresMasProxima;
                  }
                })() : 'N/A'}
              </p>
            )}
          </div>
          <div className="text-gray-400 flex-shrink-0 ml-2">
            <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Card de Prueba Dinamica Disyuntores - Solo visible si el servicio corresponde */}
      {isPruebaDisyuntores && (
        <div 
          className={`bg-gradient-to-b from-black to-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white border border-gray-800 shadow-sm ${userRole === 'admin' ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
          onClick={() => userRole === 'admin' && handlePendienteCardClick('pruebaDisyuntores')}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-300 text-xs sm:text-sm truncate">
                {userRole === 'admin' ? 'Prueba Disyuntores Pendiente de Entrega' : 'Prueba Disyuntores'}
              </p>
              {loadingMediciones ? (
                <div className="h-6 sm:h-8 bg-gray-300 rounded w-12 sm:w-16 animate-pulse mt-1"></div>
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  {userRole === 'admin' 
                    ? pendienteEntregaCounts.pruebaDisyuntores 
                    : 0}
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
      )}
    </div>

      

      {/* Gráfico de Estados de Mediciones por Tipo de Estudio o Incumplimientos según rol */}
      <div className="mb-4 sm:mb-6">
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h4 className="text-base sm:text-lg font-medium text-gray-900">
              {userRole === 'admin' 
                ? `Estado de Procesamiento de los Monitoreos Laborales - ${empresa?.nombre || 'Empresa'}`
                : `Incumplimientos por Tipo de Estudio - ${empresa?.nombre || 'Empresa'}`
              }
            </h4>
        </div>
        
          {loadingMediciones ? (
            <div className="h-[250px] sm:h-[350px] bg-gray-100 rounded animate-pulse" />
          ) : (
            (() => {
              const isArcosDorados = empresaId === 'ARCOS DORADOS' || empresa?.nombre === 'ARCOS DORADOS';
              const isManager = userRole === 'general_manager' || userRole === 'branch_manager';
              
              // Si es gerente, mostrar incumplimientos (CUMPLE, NO CUMPLE y EN PROCESO)
              if (isManager) {
                const chartData = [
                  {
                    name: "EST. PAT",
                    "CUMPLE": incumplimientosCountsForChart.pat.cumple,
                    "NO CUMPLE": incumplimientosCountsForChart.pat.noCumple,
                    "EN PROCESO": incumplimientosCountsForChart.pat.enProceso
                  },
                  {
                    name: "EST. ILU",
                    "CUMPLE": incumplimientosCountsForChart.iluminacion.cumple,
                    "NO CUMPLE": incumplimientosCountsForChart.iluminacion.noCumple,
                    "EN PROCESO": incumplimientosCountsForChart.iluminacion.enProceso
                  },
                  {
                    name: "EST. RUIDO",
                    "CUMPLE": incumplimientosCountsForChart.ruido.cumple,
                    "NO CUMPLE": incumplimientosCountsForChart.ruido.noCumple,
                    "EN PROCESO": incumplimientosCountsForChart.ruido.enProceso
                  },
                  {
                    name: "EST. TERMOG.",
                    "CUMPLE": incumplimientosCountsForChart.termografia.cumple,
                    "NO CUMPLE": incumplimientosCountsForChart.termografia.noCumple,
                    "EN PROCESO": incumplimientosCountsForChart.termografia.enProceso
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
                  },
                  "EN PROCESO": {
                    label: "EN PROCESO",
                    color: "rgba(59, 130, 246, 0.4)"
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
                            label={{ value: 'Cantidad de Mediciones', angle: -90, position: 'insideLeft' }}
                          />
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                          />
                          <Bar dataKey="CUMPLE" fill="rgba(34, 197, 94, 0.67)" radius={4} />
                          <Bar dataKey="NO CUMPLE" fill="rgba(239, 68, 68, 0.67)" radius={4} />
                          <Bar dataKey="EN PROCESO" fill="rgba(59, 130, 246, 0.67)" radius={4} />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  </div>
                );
              }
              
              // Si es admin, mostrar estados de mediciones (comportamiento original)
              const chartData = [
                {
                  name: "EST. PAT",
                  "EN NUBE": medicionesCountsEmpresa.pat.enNube,
                  "Procesar": medicionesCountsEmpresa.pat.procesar,
                  "PEDIR A TEC": medicionesCountsEmpresa.pat.pedirTecnico,
                  "PENDIENTE": medicionesCountsEmpresa.pat.pendienteVisita
                },
                {
                  name: "EST. ILU",
                  "EN NUBE": medicionesCountsEmpresa.iluminacion.enNube,
                  "Procesar": medicionesCountsEmpresa.iluminacion.procesar,
                  "PEDIR A TEC": medicionesCountsEmpresa.iluminacion.pedirTecnico,
                  "PENDIENTE": medicionesCountsEmpresa.iluminacion.pendienteVisita
                },
                {
                  name: "EST. RUIDO",
                  "EN NUBE": medicionesCountsEmpresa.ruido.enNube,
                  "Procesar": medicionesCountsEmpresa.ruido.procesar,
                  "PEDIR A TEC": medicionesCountsEmpresa.ruido.pedirTecnico,
                  "PENDIENTE": medicionesCountsEmpresa.ruido.pendienteVisita
                },
                {
                  name: "EST. CARGA TÉRMICA",
                  "EN NUBE": medicionesCountsEmpresa.cargaTermica.enNube,
                  "Procesar": medicionesCountsEmpresa.cargaTermica.procesar,
                  "PEDIR A TEC": medicionesCountsEmpresa.cargaTermica.pedirTecnico,
                  "PENDIENTE": medicionesCountsEmpresa.cargaTermica.pendienteVisita
                },
                {
                  name: "EST. TERMOG.",
                  "EN NUBE": medicionesCountsEmpresa.termografia.enNube,
                  "Procesar": medicionesCountsEmpresa.termografia.procesar,
                  "PEDIR A TEC": medicionesCountsEmpresa.termografia.pedirTecnico,
                  "PENDIENTE": medicionesCountsEmpresa.termografia.pendienteVisita
                },
                {
                  name: "EST. DISYUNTORES",
                  "EN NUBE": (medicionesCountsEmpresa as any).informePruebaDinamicaDisyuntores.enNube,
                  "Procesar": (medicionesCountsEmpresa as any).informePruebaDinamicaDisyuntores.procesar,
                  "PEDIR A TEC": (medicionesCountsEmpresa as any).informePruebaDinamicaDisyuntores.pedirTecnico,
                  "PENDIENTE": (medicionesCountsEmpresa as any).informePruebaDinamicaDisyuntores.pendienteVisita
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
                          label={{ value: 'Cantidad de Mediciones', angle: -90, position: 'insideLeft' }}
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

      {/* Modal de sucursales con estudios pendientes */}
      {showPendienteModal && selectedStudyType && (
        <PendienteModal
          studyType={selectedStudyType}
          sucursales={sucursalesConPendiente}
          empresaId={empresaId}
          onClose={() => {
            setShowPendienteModal(false);
            setSelectedStudyType(null);
            setSucursalesConPendiente([]);
          }}
        />
      )}

      {/* Modal de extintores próximos a vencer */}
      {showExtintoresModal && (
        <ExtintoresModal
          extintores={extintoresProximosAVencer}
          empresaId={empresaId}
          onClose={() => setShowExtintoresModal(false)}
        />
      )}
    
       
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

interface PendienteModalProps {
  studyType: 'pat' | 'iluminacion' | 'ruido' | 'pruebaDisyuntores';
  sucursales: Array<{ sucursalId: string; sucursalNombre: string }>;
  empresaId: string;
  onClose: () => void;
}

function PendienteModal({ studyType, sucursales, empresaId, onClose }: PendienteModalProps) {
  const studyNames = {
    pat: 'PAT',
    iluminacion: 'Iluminación',
    ruido: 'Ruido',
    pruebaDisyuntores: 'Prueba Dinámica Disyuntores'
  };

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
                {studyNames[studyType]} - Pendiente de Entrega
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
            
            {sucursales.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>No hay sucursales con estudios pendientes de entrega para este tipo.</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="space-y-3">
                  {sucursales.map((sucursal, index) => (
                    <div
                      key={`${sucursal.sucursalId}_${index}`}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-gray-900 truncate">
                          {sucursal.sucursalNombre}
                        </p>
                      </div>
                      <Link
                        href={`/dashboard/empresas/${encodeURIComponent(empresaId)}/sucursales/${encodeURIComponent(sucursal.sucursalId)}`}
                        className="ml-4 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex-shrink-0"
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

interface ExtintoresModalProps {
  extintores: Array<{
    sucursalId: string;
    sucursalNombre: string;
    fechaVencimiento: string;
    fechaVencimientoDate: Date;
    estaVencido: boolean;
  }>;
  empresaId: string;
  onClose: () => void;
}

function ExtintoresModal({ extintores, empresaId, onClose }: ExtintoresModalProps) {
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
                Extintores próximos a vencer
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
            
            {extintores.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>No hay extintores próximos a vencer en los próximos 30 días.</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="space-y-3">
                  {extintores.map((extintor, index) => (
                    <div
                      key={`${extintor.sucursalId}_${index}`}
                      className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                        extintor.estaVencido ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900">{extintor.sucursalNombre}</p>
                            {extintor.estaVencido && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-red-600 text-white rounded">
                                VENCIDO
                              </span>
                            )}
                            {!extintor.estaVencido && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-600 text-white rounded">
                                PRÓXIMO A VENCER
                              </span>
                            )}
                          </div>
                          <p className={`text-sm ${extintor.estaVencido ? 'text-red-700' : 'text-yellow-700'}`}>
                            Fecha de vencimiento: {(() => {
                              try {
                                const fecha = extintor.fechaVencimientoDate;
                                if (fecha && !isNaN(fecha.getTime())) {
                                  return fecha.toLocaleDateString('es-AR', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  });
                                }
                                return extintor.fechaVencimiento;
                              } catch {
                                return extintor.fechaVencimiento;
                              }
                            })()}
                          </p>
                        </div>
                        <Link
                          href={`/dashboard/empresas/${encodeURIComponent(empresaId)}/sucursales/${encodeURIComponent(extintor.sucursalId)}`}
                          className="ml-4 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex-shrink-0"
                          onClick={onClose}
                        >
                          Ver detalle
                        </Link>
                      </div>
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