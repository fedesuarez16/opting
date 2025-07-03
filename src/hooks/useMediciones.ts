import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

interface Medicion {
  id: string;
  'FECHAS DE MEDICIÓN': string;
  TÉCNICO: string;
  SERVICIO: string;
  SUCURSAL: string;
  CLIENTE: string;
  fechaCreacion?: string;
  [key: string]: string | number | boolean | undefined;
}

export function useMediciones(empresa: string, sucursal: string) {
  const [mediciones, setMediciones] = useState<Medicion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMediciones() {
      if (!empresa || !sucursal) {
        setMediciones([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const medicionesRef = collection(
          firestore,
          'empresas',
          empresa,
          'sucursales',
          sucursal,
          'mediciones'
        );
        
        const q = query(medicionesRef, orderBy('fechaCreacion', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const medicionesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Medicion[];
        
        setMediciones(medicionesData);
      } catch (err) {
        console.error('Error fetching mediciones:', err);
        setError('Error al cargar las mediciones');
      } finally {
        setLoading(false);
      }
    }

    fetchMediciones();
  }, [empresa, sucursal]);

  return { mediciones, loading, error };
} 