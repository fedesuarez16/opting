import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export interface Empresa {
  id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  cuit?: string;
  totalSucursales?: number;
  totalEmpleados?: number;
  fechaCreacion?: string;
  estado?: 'activa' | 'inactiva';
  oneDriveFolderId?: string;
}

export function useEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmpresas = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Iniciando fetchEmpresas...');
      const empresasCollection = collection(firestore, 'empresas');
      console.log('Colección de empresas obtenida:', empresasCollection.path);
      
      const empresasSnapshot = await getDocs(empresasCollection);
      console.log('Snapshot obtenido, documentos:', empresasSnapshot.size);
      
      const empresasList: Empresa[] = [];
      
      // Si no hay documentos, intentar obtener las empresas de otra manera
      if (empresasSnapshot.empty) {
        console.log('No se encontraron documentos en la colección empresas. Intentando listar las colecciones...');
        
        // Intentar obtener las empresas directamente
        try {
          // En Firestore, no podemos listar colecciones directamente desde el cliente
          // Pero podemos intentar acceder a documentos específicos si conocemos sus IDs
          
          // Verificar si hay documentos en la colección empresas
          console.log('Verificando la estructura de Firestore...');
          
          // Intentar obtener un documento específico si conocemos su ID
          // Esto es solo un ejemplo, necesitarías conocer un ID real
          const testDoc = await getDoc(doc(firestore, 'empresas', 'test-empresa'));
          console.log('Documento de prueba existe:', testDoc.exists());
          
          if (testDoc.exists()) {
            const data = testDoc.data();
            empresasList.push({
              id: testDoc.id,
              nombre: data.CLIENTE || data.nombre || 'Sin nombre',
              direccion: data.direccion || 'No disponible',
              telefono: data.telefono || 'No disponible',
              email: data.email || 'No disponible',
              cuit: data.cuit || data.CUIT || 'No disponible',
              totalSucursales: data.totalSucursales || 0,
              totalEmpleados: data.totalEmpleados || 0,
              fechaCreacion: data.fechaCreacion ? new Date(data.fechaCreacion.seconds * 1000).toISOString().split('T')[0] : 'No disponible',
              estado: data.estado || 'activa',
            });
          }
        } catch (innerErr) {
          console.error('Error al intentar verificar la estructura:', innerErr);
        }
      } else {
        // Procesar los documentos normalmente
        empresasSnapshot.forEach((doc) => {
          console.log('Procesando documento:', doc.id);
          const data = doc.data();
          console.log('Datos del documento:', data);
          
          // Mostrar todas las propiedades del documento para depuración
          console.log('Propiedades del documento:');
          Object.keys(data).forEach(key => {
            console.log(`  ${key}: ${JSON.stringify(data[key])}`);
          });
          
          // Intentar extraer el nombre con diferentes propiedades posibles
          const nombre = data.CLIENTE || data.nombre || data.cliente || 'Sin nombre';
          console.log('Nombre extraído:', nombre);
          
          empresasList.push({
            id: doc.id,
            nombre: nombre,
            direccion: data.direccion || 'No disponible',
            telefono: data.telefono || 'No disponible',
            email: data.email || 'No disponible',
            cuit: data.cuit || data.CUIT || 'No disponible',
            totalSucursales: data.totalSucursales || 0,
            totalEmpleados: data.totalEmpleados || 0,
            fechaCreacion: data.fechaCreacion ? new Date(data.fechaCreacion.seconds * 1000).toISOString().split('T')[0] : 'No disponible',
            estado: data.estado || 'activa',
          });
        });
      }
      
      console.log('Lista de empresas final:', empresasList);
      setEmpresas(empresasList);
    } catch (err) {
      console.error('Error al obtener empresas:', err);
      setError('Error al cargar las empresas');
    } finally {
      setLoading(false);
    }
  };

  const addEmpresa = async (empresa: Omit<Empresa, 'id'>) => {
    try {
      // Usar el nombre de la empresa como ID del documento (igual que en Google Sheets)
      const empresaId = empresa.nombre;
      const empresaRef = doc(firestore, 'empresas', empresaId);
      
      await setDoc(empresaRef, {
        ...empresa,
        nombre: empresa.nombre, // Asegurar que el nombre esté en el documento
        fechaCreacion: new Date(),
      });
      
      console.log('Empresa agregada con ID:', empresaId);
      
      // Refrescar la lista de empresas
      fetchEmpresas();
      return empresaId;
    } catch (err) {
      console.error('Error al agregar empresa:', err);
      throw err;
    }
  };

  const updateEmpresa = async (id: string, empresa: Partial<Empresa>) => {
    try {
      const empresaRef = doc(firestore, 'empresas', id);
      await updateDoc(empresaRef, empresa);
      
      console.log('Empresa actualizada:', id);
      
      // Refrescar la lista de empresas
      fetchEmpresas();
    } catch (err) {
      console.error('Error al actualizar empresa:', err);
      throw err;
    }
  };

  const deleteEmpresa = async (id: string) => {
    try {
      const empresaRef = doc(firestore, 'empresas', id);
      await deleteDoc(empresaRef);
      
      console.log('Empresa eliminada:', id);
      
      // Refrescar la lista de empresas
      fetchEmpresas();
    } catch (err) {
      console.error('Error al eliminar empresa:', err);
      throw err;
    }
  };

  // Cargar empresas al montar el componente
  useEffect(() => {
    fetchEmpresas();
  }, []);

  return {
    empresas,
    loading,
    error,
    fetchEmpresas,
    addEmpresa,
    updateEmpresa,
    deleteEmpresa,
  };
} 