import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export function useSucursalesCount() {
  const [sucursalesCounts, setSucursalesCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSucursalesCounts = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('useSucursalesCount - Iniciando conteo rápido...');
      
      // Obtener todas las empresas
      const empresasCollection = collection(firestore, 'empresas');
      const empresasSnapshot = await getDocs(empresasCollection);
      
      // Contar sucursales para cada empresa en paralelo
      const countPromises = empresasSnapshot.docs.map(async (empresaDoc) => {
        const sucursalesCollection = collection(empresaDoc.ref, 'sucursales');
        const sucursalesSnapshot = await getDocs(sucursalesCollection);
        return {
          empresaId: empresaDoc.id,
          count: sucursalesSnapshot.size
        };
      });
      
      const results = await Promise.all(countPromises);
      
      // Construir el objeto de conteos
      const counts: Record<string, number> = {};
      results.forEach(({ empresaId, count }) => {
        counts[empresaId] = count;
      });
      
      console.log('useSucursalesCount - Conteos obtenidos:', counts);
      setSucursalesCounts(counts);
    } catch (err) {
      console.error('Error al obtener conteos de sucursales:', err);
      setError('Error al cargar el conteo de sucursales');
    } finally {
      setLoading(false);
    }
  };

  // Cargar conteos al montar el componente
  useEffect(() => {
    fetchSucursalesCounts();
  }, []);

  return {
    sucursalesCounts,
    loading,
    error,
    fetchSucursalesCounts,
    totalSucursales: Object.values(sucursalesCounts).reduce((acc, count) => acc + count, 0)
  };
}
