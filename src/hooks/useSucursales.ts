import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export interface Sucursal {
  id: string;
  nombre: string;
  empresaId: string;
  empresaNombre?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  totalEmpleados?: number;
  fechaCreacion?: string;
  estado?: 'activa' | 'inactiva';
  enNube?: boolean;
  categorias?: string[];
}

export function useSucursales(empresaId?: string) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const toCategorias = (value: unknown): string[] | undefined => {
    if (Array.isArray(value)) {
      return value.map((v) => String(v)).filter((v) => v.trim().length > 0);
    }
    if (typeof value === 'string') {
      // split by comma or semicolon
      return value
        .split(/[,;]+/)
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    }
    return undefined;
  };

  const fetchSucursales = async () => {
    console.log('useSucursales - fetchSucursales iniciado para empresaId:', empresaId);
    setLoading(true);
    setError(null);
    try {
      let sucursalesQuery;
      
      if (empresaId) {
        // Si se proporciona un ID de empresa, obtener solo las sucursales de esa empresa
        console.log('useSucursales - Buscando sucursales para empresa:', empresaId);
        const empresaRef = doc(firestore, 'empresas', empresaId);
        sucursalesQuery = collection(empresaRef, 'sucursales');
        console.log('useSucursales - Referencia de colección creada:', empresaRef.path);
      } else {
        // Obtener todas las sucursales de todas las empresas
        const empresasCollection = collection(firestore, 'empresas');
        const empresasSnapshot = await getDocs(empresasCollection);
        
        const sucursalesList: Sucursal[] = [];
        
        // Para cada empresa, obtener sus sucursales
        for (const empresaDoc of empresasSnapshot.docs) {
          const empresaData = empresaDoc.data();
          const sucursalesCollection = collection(empresaDoc.ref, 'sucursales');
          const sucursalesSnapshot = await getDocs(sucursalesCollection);
          
          sucursalesSnapshot.forEach((sucursalDoc) => {
            const data = sucursalDoc.data();
            const enNube = (data.enNube ?? data.EN_NUBE ?? data.en_nube ?? data.nube ?? false) as boolean;
            const categorias =
              toCategorias(
                data.categorias ?? data.CATEGORIAS ?? data.categoria ?? data.CATEGORIA ?? undefined
              );
            sucursalesList.push({
              id: sucursalDoc.id,
              nombre: data.SUCURSAL || data.nombre || 'Sin nombre',
              empresaId: empresaDoc.id,
              empresaNombre: empresaData.CLIENTE || empresaData.nombre || 'Sin nombre',
              direccion: data.direccion || 'No disponible',
              telefono: data.telefono || 'No disponible',
              email: data.email || 'No disponible',
              totalEmpleados: data.totalEmpleados || 0,
              fechaCreacion: data.fechaCreacion ? new Date(data.fechaCreacion.seconds * 1000).toISOString().split('T')[0] : 'No disponible',
              estado: data.estado || 'activa',
              enNube,
              categorias,
            });
          });
        }
        
        setSucursales(sucursalesList);
        setLoading(false);
        return;
      }
      
      // Si llegamos aquí, es porque se proporcionó un empresaId
      const sucursalesSnapshot = await getDocs(sucursalesQuery);
      
      console.log('useSucursales - Snapshot obtenido, tamaño:', sucursalesSnapshot.size);
      console.log('useSucursales - ¿Está vacío?', sucursalesSnapshot.empty);
      
      const sucursalesList: Sucursal[] = [];
      
      sucursalesSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('useSucursales - Documento de sucursal encontrado:', doc.id, data);
        const enNube = (data.enNube ?? data.EN_NUBE ?? data.en_nube ?? data.nube ?? false) as boolean;
        const categorias =
          toCategorias(
            data.categorias ?? data.CATEGORIAS ?? data.categoria ?? data.CATEGORIA ?? undefined
          );
        sucursalesList.push({
          id: doc.id,
          nombre: data.SUCURSAL || data.nombre || 'Sin nombre',
          empresaId: empresaId,
          direccion: data.direccion || 'No disponible',
          telefono: data.telefono || 'No disponible',
          email: data.email || 'No disponible',
          totalEmpleados: data.totalEmpleados || 0,
          fechaCreacion: data.fechaCreacion ? new Date(data.fechaCreacion.seconds * 1000).toISOString().split('T')[0] : 'No disponible',
          estado: data.estado || 'activa',
          enNube,
          categorias,
        });
      });
      
      console.log('useSucursales - Lista final de sucursales:', sucursalesList);
      setSucursales(sucursalesList);
    } catch (err) {
      console.error('Error al obtener sucursales:', err);
      setError('Error al cargar las sucursales');
    } finally {
      setLoading(false);
    }
  };

  const addSucursal = async (sucursal: Omit<Sucursal, 'id'>) => {
    try {
      const empresaRef = doc(firestore, 'empresas', sucursal.empresaId);
      const sucursalesCollection = collection(empresaRef, 'sucursales');
      
      const docRef = await addDoc(sucursalesCollection, {
        ...sucursal,
        fechaCreacion: new Date(),
      });
      
      // Refrescar la lista de sucursales
      fetchSucursales();
      return docRef.id;
    } catch (err) {
      console.error('Error al agregar sucursal:', err);
      throw err;
    }
  };

  const updateSucursal = async (empresaId: string, sucursalId: string, sucursal: Partial<Sucursal>) => {
    try {
      const empresaRef = doc(firestore, 'empresas', empresaId);
      const sucursalRef = doc(collection(empresaRef, 'sucursales'), sucursalId);
      
      await updateDoc(sucursalRef, sucursal);
      
      // Refrescar la lista de sucursales
      fetchSucursales();
    } catch (err) {
      console.error('Error al actualizar sucursal:', err);
      throw err;
    }
  };

  const deleteSucursal = async (empresaId: string, sucursalId: string) => {
    try {
      const empresaRef = doc(firestore, 'empresas', empresaId);
      const sucursalRef = doc(collection(empresaRef, 'sucursales'), sucursalId);
      
      await deleteDoc(sucursalRef);
      
      // Refrescar la lista de sucursales
      fetchSucursales();
    } catch (err) {
      console.error('Error al eliminar sucursal:', err);
      throw err;
    }
  };

  // Cargar sucursales al montar el componente o cuando cambia el empresaId
  useEffect(() => {
    fetchSucursales();
  }, [empresaId, fetchSucursales]);

  return {
    sucursales,
    loading,
    error,
    fetchSucursales,
    addSucursal,
    updateSucursal,
    deleteSucursal,
  };
} 