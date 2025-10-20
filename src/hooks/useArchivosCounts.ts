import { useState, useEffect } from 'react';
import { getDocs, collectionGroup } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export function useMedicionesCounts() {
  const [medicionesCounts, setMedicionesCounts] = useState({
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
  });

  const [incumplimientosCounts, setIncumplimientosCounts] = useState({
    patNoCumple: 0,
    iluNoCumple: 0,
    ruidoNoCumple: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMedicionesCounts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Usar collectionGroup para obtener todas las mediciones de todas las sucursales
      const medicionesQuery = collectionGroup(firestore, 'mediciones');
      const medicionesSnapshot = await getDocs(medicionesQuery);
      
      // Usar Sets para contar sucursales únicas por estado y tipo
      const patPendienteVisita = new Set<string>();
      const patPedirTecnico = new Set<string>();
      const patProcesar = new Set<string>();
      const patEnNube = new Set<string>();
      
      const iluPendienteVisita = new Set<string>();
      const iluPedirTecnico = new Set<string>();
      const iluProcesar = new Set<string>();
      const iluEnNube = new Set<string>();
      
      const ruidoPendienteVisita = new Set<string>();
      const ruidoPedirTecnico = new Set<string>();
      const ruidoProcesar = new Set<string>();
      const ruidoEnNube = new Set<string>();
      
      const cargaPendienteVisita = new Set<string>();
      const cargaPedirTecnico = new Set<string>();
      const cargaProcesar = new Set<string>();
      const cargaEnNube = new Set<string>();
      
      const termoPendienteVisita = new Set<string>();
      const termoPedirTecnico = new Set<string>();
      const termoProcesar = new Set<string>();
      const termoEnNube = new Set<string>();
      
      // Sets para contar incumplimientos
      const patNoCumple = new Set<string>();
      const iluNoCumple = new Set<string>();
      const ruidoNoCumple = new Set<string>();
      
      const todasLasSucursales = new Set<string>();
      
      medicionesSnapshot.forEach((doc) => {
        const datos = doc.data() as Record<string, unknown>;
        const getValue = (k: string) => String((datos[k] ?? '') as unknown);
        
        // Extraer el ID de la sucursal desde el path del documento
        const pathParts = doc.ref.path.split('/');
        const sucursalId = pathParts.length >= 4 ? pathParts[3] : null;
        
        if (sucursalId) {
          todasLasSucursales.add(sucursalId);
          
          // PAT (PUESTA A TIERRA)
          const patValue = getValue('PUESTA A TIERRA');
          if (patValue === 'PENDIENTE') patPendienteVisita.add(sucursalId);
          else if (patValue === 'PEDIR A TEC') patPedirTecnico.add(sucursalId);
          else if (patValue === 'PROCESAR') patProcesar.add(sucursalId);
          else if (patValue === 'EN NUBE') patEnNube.add(sucursalId);
          
          // ILUMINACIÓN
          const iluValue = getValue('ILUMINACIÓN');
          if (iluValue === 'PENDIENTE') iluPendienteVisita.add(sucursalId);
          else if (iluValue === 'PEDIR A TEC') iluPedirTecnico.add(sucursalId);
          else if (iluValue === 'PROCESAR') iluProcesar.add(sucursalId);
          else if (iluValue === 'EN NUBE') iluEnNube.add(sucursalId);
          
          // RUIDO
          const ruidoValue = getValue('RUIDO');
          if (ruidoValue === 'PENDIENTE') ruidoPendienteVisita.add(sucursalId);
          else if (ruidoValue === 'PEDIR A TEC') ruidoPedirTecnico.add(sucursalId);
          else if (ruidoValue === 'PROCESAR') ruidoProcesar.add(sucursalId);
          else if (ruidoValue === 'EN NUBE') ruidoEnNube.add(sucursalId);
          
          // CARGA TÉRMICA
          const cargaValue = getValue('CARGA TÉRMICA');
          if (cargaValue === 'PENDIENTE') cargaPendienteVisita.add(sucursalId);
          else if (cargaValue === 'PEDIR A TEC') cargaPedirTecnico.add(sucursalId);
          else if (cargaValue === 'PROCESAR') cargaProcesar.add(sucursalId);
          else if (cargaValue === 'EN NUBE') cargaEnNube.add(sucursalId);
          
          // TERMOGRAFÍA
          const termoValue = getValue('ESTUDIO TERMOGRAFIA');
          if (termoValue === 'PENDIENTE') termoPendienteVisita.add(sucursalId);
          else if (termoValue === 'PEDIR A TEC') termoPedirTecnico.add(sucursalId);
          else if (termoValue === 'PROCESAR') termoProcesar.add(sucursalId);
          else if (termoValue === 'EN NUBE') termoEnNube.add(sucursalId);
          
          // INCUMPLIMIENTOS
          const incumplimientoPAT = getValue('INCUMPLIMIENTO PAT');
          if (incumplimientoPAT === 'NO CUMPLE') patNoCumple.add(sucursalId);
          
          const incumplimientoILU = getValue('INCUMPLIMIENTO ILU');
          if (incumplimientoILU === 'NO CUMPLE') iluNoCumple.add(sucursalId);
          
          const incumplimientoRUIDO = getValue('INCUMPLIMIENTO RUIDO');
          if (incumplimientoRUIDO === 'NO CUMPLE') ruidoNoCumple.add(sucursalId);
        }
      });
      
      // Devolver valores absolutos (cantidad de sucursales por estado)
      const medicionesCountsData = { 
        pat: {
          pendienteVisita: patPendienteVisita.size,
          pedirTecnico: patPedirTecnico.size,
          procesar: patProcesar.size,
          enNube: patEnNube.size
        },
        iluminacion: {
          pendienteVisita: iluPendienteVisita.size,
          pedirTecnico: iluPedirTecnico.size,
          procesar: iluProcesar.size,
          enNube: iluEnNube.size
        },
        ruido: {
          pendienteVisita: ruidoPendienteVisita.size,
          pedirTecnico: ruidoPedirTecnico.size,
          procesar: ruidoProcesar.size,
          enNube: ruidoEnNube.size
        },
        cargaTermica: {
          pendienteVisita: cargaPendienteVisita.size,
          pedirTecnico: cargaPedirTecnico.size,
          procesar: cargaProcesar.size,
          enNube: cargaEnNube.size
        },
        termografia: {
          pendienteVisita: termoPendienteVisita.size,
          pedirTecnico: termoPedirTecnico.size,
          procesar: termoProcesar.size,
          enNube: termoEnNube.size
        }
      };

      // Log para depuración
      console.log('=== MEDICIONES COUNTS DEBUG ===');
      console.log('Total sucursales:', todasLasSucursales.size);
      console.log('Total mediciones procesadas:', medicionesSnapshot.size);
      console.log('PAT - EN NUBE:', patEnNube.size, 'sucursales');
      console.log('ILUMINACIÓN - EN NUBE:', iluEnNube.size, 'sucursales');
      console.log('RUIDO - EN NUBE:', ruidoEnNube.size, 'sucursales');
      console.log('CARGA TÉRMICA - EN NUBE:', cargaEnNube.size, 'sucursales');
      console.log('TERMOGRAFÍA - EN NUBE:', termoEnNube.size, 'sucursales');
      console.log('INCUMPLIMIENTO PAT - NO CUMPLE:', patNoCumple.size, 'sucursales');
      console.log('INCUMPLIMIENTO ILU - NO CUMPLE:', iluNoCumple.size, 'sucursales');
      console.log('INCUMPLIMIENTO RUIDO - NO CUMPLE:', ruidoNoCumple.size, 'sucursales');
      console.log('Mediciones counts data:', medicionesCountsData);
      console.log('================================');

      setMedicionesCounts(medicionesCountsData);
      setIncumplimientosCounts({
        patNoCumple: patNoCumple.size,
        iluNoCumple: iluNoCumple.size,
        ruidoNoCumple: ruidoNoCumple.size
      });
    } catch (err) {
      console.error('Error al obtener conteos de mediciones:', err);
      setError('Error al cargar el conteo de mediciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicionesCounts();
  }, []);

  return {
    medicionesCounts,
    incumplimientosCounts,
    loading,
    error,
    fetchMedicionesCounts,
  };
}
