import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export interface Medicion {
  id: string;
  empresaId: string;
  sucursalId: string;
  fecha: string;
  datos: Record<string, any>;
  createdAt?: string;
}

export function useMediciones(empresaId?: string, sucursalId?: string) {
  const [mediciones, setMediciones] = useState<Medicion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMediciones = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!empresaId) {
        // Si no hay empresaId, no podemos obtener mediciones
        setMediciones([]);
        setLoading(false);
        return;
      }

      const empresaRef = doc(firestore, 'empresas', empresaId);
      let medicionesQuery;

      if (sucursalId) {
        // Si tenemos sucursalId, obtenemos las mediciones de esa sucursal
        const sucursalRef = doc(collection(empresaRef, 'sucursales'), sucursalId);
        medicionesQuery = collection(sucursalRef, 'mediciones');
      } else {
        // Si no tenemos sucursalId, obtenemos todas las sucursales y sus mediciones
        const sucursalesCollection = collection(empresaRef, 'sucursales');
        const sucursalesSnapshot = await getDocs(sucursalesCollection);
        
        // Para cada sucursal, obtener sus mediciones (paralelizar las consultas)
        const medicionesPromises = sucursalesSnapshot.docs.map(async (sucursalDoc) => {
          const medicionesCollection = collection(sucursalDoc.ref, 'mediciones');
          const medicionesSnapshot = await getDocs(medicionesCollection);
          
          const sucursalMediciones: Medicion[] = [];
          medicionesSnapshot.forEach((medicionDoc) => {
            const data = medicionDoc.data();
            sucursalMediciones.push({
              id: medicionDoc.id,
              empresaId,
              sucursalId: sucursalDoc.id,
              fecha: data.fecha || medicionDoc.id,
              datos: data,
              createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : undefined,
            });
          });
          return sucursalMediciones;
        });
        
        const allMediciones = await Promise.all(medicionesPromises);
        const medicionesList = allMediciones.flat();
        
        // Ordenar por fecha descendente
        medicionesList.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        
        setMediciones(medicionesList);
        setLoading(false);
        return;
      }
      
      // Si llegamos aquí, es porque se proporcionó un sucursalId
      console.log('useMediciones - Buscando mediciones para:', { empresaId, sucursalId });
      const medicionesSnapshot = await getDocs(medicionesQuery);
      
      console.log('useMediciones - Mediciones snapshot:', {
        size: medicionesSnapshot.size,
        empty: medicionesSnapshot.empty
      });
      
      const medicionesList: Medicion[] = [];
      
      medicionesSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('useMediciones - Documento de medición:', doc.id, data);
        medicionesList.push({
          id: doc.id,
          empresaId,
          sucursalId,
          fecha: data.fecha || data['FECHAS DE MEDICIÓN'] || doc.id,
          datos: data,
          createdAt: data.createdAt || data.fechaCreacion ? 
            new Date((data.createdAt || data.fechaCreacion).seconds * 1000).toISOString() : 
            undefined,
        });
      });
      
      // Ordenar por fecha descendente
      medicionesList.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      
      setMediciones(medicionesList);
    } catch (err) {
      console.error('Error al obtener mediciones:', err);
      setError('Error al cargar las mediciones');
    } finally {
      setLoading(false);
    }
  };

  // Cargar mediciones al montar el componente o cuando cambian los IDs
  useEffect(() => {
    fetchMediciones();
  }, [empresaId, sucursalId]);

  return {
    mediciones,
    loading,
    error,
    fetchMediciones,
  };
} 