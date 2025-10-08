'use client';

import { useState, use } from 'react';
import { useMediciones, Medicion } from '@/hooks/useMediciones';
import { useSucursales } from '@/hooks/useSucursales';
import { useEmpresas } from '@/hooks/useEmpresas';
import Link from 'next/link';
import { storage, firestore } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';

interface SucursalDetailPageProps {
  params: Promise<{
    id: string;
    sucursalId: string;
  }>;
}

export default function SucursalDetailPage({ params }: SucursalDetailPageProps) {
  const resolvedParams = use(params);
  const empresaId = decodeURIComponent(resolvedParams.id);
  const sucursalId = decodeURIComponent(resolvedParams.sucursalId);
  
  const { mediciones, loading: loadingMediciones, error: errorMediciones } = useMediciones(empresaId, sucursalId);
  const { sucursales } = useSucursales(empresaId);
  const { empresas } = useEmpresas();
  
  const empresa = empresas.find(e => e.id === empresaId);
  const sucursal = sucursales.find(s => s.id === sucursalId);
  
  const [search, setSearch] = useState('');
  const [selectedMedicion, setSelectedMedicion] = useState<Medicion | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedOk, setUploadedOk] = useState<boolean>(false);
  const [archivos, setArchivos] = useState<Array<{ id: string; nombre: string; tipo?: string; tamano?: number; url: string; fechaSubida?: unknown }>>([]);
  const [loadingArchivos, setLoadingArchivos] = useState<boolean>(true);

  const fetchArchivos = async () => {
    try {
      setLoadingArchivos(true);
      const sucursalRef = doc(firestore, 'empresas', empresaId, 'sucursales', sucursalId);
      const q = query(collection(sucursalRef, 'archivos'), orderBy('fechaSubida', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          nombre: (data.nombre as string) || 'Sin nombre',
          tipo: data.tipo as string,
          tamano: data.tamano as number,
          url: (data.url as string) || '',
          fechaSubida: data.fechaSubida
        };
      });
      setArchivos(list);
    } catch (e) {
      console.error('Error al cargar archivos:', e);
    } finally {
      setLoadingArchivos(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setUploadedOk(false);
    try {
      const storagePath = `empresas/${empresaId}/sucursales/${sucursalId}/archivos/${Date.now()}-${file.name}`;
      const fileRef = ref(storage, storagePath);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      // Guardar metadata en subcolección archivos
      const sucursalRef = doc(firestore, 'empresas', empresaId, 'sucursales', sucursalId);
      await addDoc(collection(sucursalRef, 'archivos'), {
        nombre: file.name,
        tipo: file.type,
        tamano: file.size,
        url,
        path: storagePath,
        fechaSubida: new Date(),
      });
      setUploadedOk(true);
      fetchArchivos();
    } catch (err: any) {
      console.error('Error al subir archivo:', err);
      setUploadError('Error al subir archivo');
    } finally {
      setUploading(false);
      // clean input value so the same file can trigger again
      if (e.target) e.target.value = '' as any;
    }
  };

  // Debug
  console.log('SucursalDetailPage - EmpresaId:', empresaId);
  console.log('SucursalDetailPage - SucursalId:', sucursalId);
  console.log('SucursalDetailPage - Empresa:', empresa);
  console.log('SucursalDetailPage - Sucursal:', sucursal);
  console.log('SucursalDetailPage - Mediciones:', mediciones);

  // Cargar archivos al montar
  useState(() => { fetchArchivos(); });

  const filteredMediciones = mediciones.filter(medicion => 
    medicion.fecha.toLowerCase().includes(search.toLowerCase()) ||
    (medicion.datos.TÉCNICOS && medicion.datos.TÉCNICOS.toLowerCase().includes(search.toLowerCase())) ||
    (medicion.datos.SERVICIO && medicion.datos.SERVICIO.toLowerCase().includes(search.toLowerCase()))
  );

  // Totales de KPI para ESTA sucursal
  const _kpis = (() => {
    let puesta = 0;
    let informe = 0;
    let incumpl = 0;
    let extintores = 0;
    mediciones.forEach((m) => {
      const datos = m.datos as Record<string, unknown>;
      const up = (k: string) => String((datos[k] ?? '') as any).toUpperCase();
      if (up('PUESTA A TIERRA') === 'EN NUBE') puesta += 1;
      if (up('INFORME DE VISITA') === 'EN NUBE') informe += 1;
      if (up('INCUMPLIMIENTO') === 'PENDIENTE') incumpl += 1;
      if (up('REGISTRO DE EXTINTORES') === 'EN NUBE') extintores += 1;
    });
    return { puesta, informe, incumpl, extintores };
  })();

  if (loadingMediciones) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (errorMediciones) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {errorMediciones}</span>
      </div>
    );
  }

  return (
    <div className='p-8 bg-white'>
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex shadow-sm h-12 rounded-lg px-2" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/dashboard/empresas" className="text-gray-700 hover:text-gray-600">
                Empresas
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <Link href={`/dashboard/empresas/${empresaId}/sucursales`} className="ml-1 text-gray-700 hover:text-gray-600 md:ml-2">
                  {empresa?.nombre || 'Empresa'}
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <span className="ml-1 text-gray-500 md:ml-2">{sucursal?.nombre || 'Sucursal'}</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-2xl font-semibold text-gray-900">
            Mediciones de {sucursal?.nombre || 'Sucursal'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {empresa?.nombre || 'Empresa'} - {filteredMediciones.length} mediciones encontradas
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-900 cursor-pointer">
            {uploading ? 'Subiendo...' : 'Subir archivo'}
            <input type="file" className="hidden" onChange={handleUpload} accept="*/*" />
          </label>
          {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
          {uploadedOk && <p className="text-xs text-emerald-600 mt-1">Archivo subido correctamente</p>}
        </div>
      </div>


     

      {/* Información de la sucursal */}
      {sucursal && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Información de la Sucursal</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Dirección</p>
                <p className="mt-1 text-sm text-gray-900">{sucursal.direccion || 'No disponible'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Teléfono</p>
                <p className="mt-1 text-sm text-gray-900">{sucursal.telefono || 'No disponible'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="mt-1 text-sm text-gray-900">{sucursal.email || 'No disponible'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Estado</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  sucursal.estado === 'activa' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {sucursal.estado === 'activa' ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="mb-6">
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
            className="bg-white h-10 block w-full pl-10 sm:text-sm rounded-md border-gray-300 ring-1 ring-gray-200 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 placeholder-gray-400"
            placeholder="Buscar mediciones por fecha, técnico o servicio..."
          />
        </div>
      </div>

      {/* Tabla de mediciones */}
      {filteredMediciones.length === 0 ? (
        <div className="bg-gray-100 rounded-3xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
          <p className="text-lg mb-2">No se encontraron mediciones para esta sucursal.</p>
          <p className="text-sm">Las mediciones se encuentran en la subcolección de esta sucursal en Firestore.</p>
        </div>
      ) : (
        <div className="bg-gray-100 rounded-3xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Mediciones</h3>
            </div>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Técnico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMediciones.map((medicion) => (
                <tr key={medicion.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {medicion.fecha}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {medicion.datos.TÉCNICOS || medicion.datos.tecnico || 'No especificado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {medicion.datos.SERVICIO || medicion.datos.servicio || 'No especificado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      Registrada
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedMedicion(medicion)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Ver detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

       {/* Archivos subidos */}
       <div className="bg-gray-100 mt-4 rounded-3xl shadow-sm border border-gray-100 mb-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Archivos</h3>
          <button onClick={fetchArchivos} className="text-xs text-gray-600 hover:text-gray-900">Actualizar</button>
        </div>
        {loadingArchivos ? (
          <div className="p-6 text-gray-500">Cargando archivos...</div>
        ) : archivos.length === 0 ? (
          <div className="p-6 text-gray-500">Aún no hay archivos subidos.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamaño</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {archivos.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-[24rem]" title={a.nombre}>{a.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{a.tipo || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{a.tamano ? `${(a.tamano/1024).toFixed(1)} KB` : '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">Ver / Descargar</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalles de medición */}
      {selectedMedicion && (
        <MedicionDetailModal
          medicion={selectedMedicion}
          onClose={() => setSelectedMedicion(null)}
        />
      )}
    </div>
  );
}

interface MedicionDetailModalProps {
  medicion: Medicion;
  onClose: () => void;
}

function MedicionDetailModal({ medicion, onClose }: MedicionDetailModalProps) {
  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-100 bg-opacity-50 transition-opacity z-40" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Detalles de Medición - {medicion.fecha}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(medicion.datos).map(([key, value]) => {
                  // Saltear campos internos de Firebase
                  if (key.startsWith('_') || key === 'fechaCreacion') return null;
                  
                  return (
                    <div key={key} className="border-b border-gray-200 pb-2">
                      <p className="text-sm font-medium text-gray-600">{key}</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {value !== null && value !== undefined ? String(value) : 'No especificado'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 