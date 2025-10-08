import { useState, useEffect } from 'react';
import { getDocs, collectionGroup } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export function useMedicionesCounts() {
  const [medicionesCounts, setMedicionesCounts] = useState({
    puestaTierra: 0,
    ruido: 0,
    iluminacion: 0
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
      
      let puestaTierra = 0;
      let ruido = 0;
      let iluminacion = 0;
      
      medicionesSnapshot.forEach((doc) => {
        const datos = doc.data() as Record<string, unknown>;
        const getValue = (k: string) => String((datos[k] ?? '') as unknown);
        
        // Usar la misma lógica que en las páginas de sucursales
        if (getValue('PUESTA A TIERRA') === 'EN NUBE') puestaTierra += 1;
        if (getValue('ILUMINACIÓN') === 'EN NUBE') iluminacion += 1;
        if (getValue('RUIDO') === 'EN NUBE') ruido += 1;
      });
      
      setMedicionesCounts({ puestaTierra, ruido, iluminacion });
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
    loading,
    error,
    fetchMedicionesCounts,
  };
}
