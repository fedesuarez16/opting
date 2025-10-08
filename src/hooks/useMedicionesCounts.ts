import { useEffect, useState } from 'react';
import { collection, collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export interface EmpresaMedicionesCounts {
  puestaTierraEnNube: number;
  informeVisitaEnNube: number;
  incumplimientoPendiente: number;
  registroExtintoresEnNube: number;
}

export function useMedicionesCounts() {
  const [countsPerEmpresa, setCountsPerEmpresa] = useState<Record<string, EmpresaMedicionesCounts>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Obtener todas las empresas
      const empresasSnapshot = await getDocs(collection(firestore, 'empresas'));
      const empresaIds = empresasSnapshot.docs.map((d) => d.id);

      // Para cada empresa, consultar todas sus mediciones vía collectionGroup filtrando por CLIENTE
      const promises = empresaIds.map(async (empresaId) => {
        const medicionesQ = query(collectionGroup(firestore, 'mediciones'), where('CLIENTE', '==', empresaId));
        const medicionesSnap = await getDocs(medicionesQ);
        let puestaTierraEnNube = 0;
        let informeVisitaEnNube = 0;
        let incumplimientoPendiente = 0;
        let registroExtintoresEnNube = 0;
        medicionesSnap.forEach((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const getUpper = (k: string) => String((data[k] ?? '') as any).toUpperCase();
          if (getUpper('PUESTA A TIERRA') === 'EN NUBE') puestaTierraEnNube += 1;
          if (getUpper('INFORME DE VISITA') === 'EN NUBE') informeVisitaEnNube += 1;
          if (getUpper('INCUMPLIMIENTO') === 'PENDIENTE') incumplimientoPendiente += 1;
          if (getUpper('REGISTRO DE EXTINTORES') === 'EN NUBE') registroExtintoresEnNube += 1;
        });
        return { empresaId, puestaTierraEnNube, informeVisitaEnNube, incumplimientoPendiente, registroExtintoresEnNube };
      });

      const results = await Promise.all(promises);
      const next: Record<string, EmpresaMedicionesCounts> = {};
      results.forEach((r) => {
        next[r.empresaId] = {
          puestaTierraEnNube: r.puestaTierraEnNube,
          informeVisitaEnNube: r.informeVisitaEnNube,
          incumplimientoPendiente: r.incumplimientoPendiente,
          registroExtintoresEnNube: r.registroExtintoresEnNube,
        };
      });
      setCountsPerEmpresa(next);
    } catch (err) {
      console.error('useMedicionesCounts error:', err);
      setError('Error al cargar métricas de mediciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  return { countsPerEmpresa, loading, error, fetchCounts };
}
