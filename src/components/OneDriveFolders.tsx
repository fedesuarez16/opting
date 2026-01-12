'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSucursales } from '@/hooks/useSucursales';

interface OneDriveFolder {
  id: string;
  name: string;
  type: 'folder' | 'file';
  childCount?: number;
  webUrl: string;
  size?: number;
  downloadUrl?: string;
}

interface OneDriveItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  childCount?: number;
  webUrl: string;
  size?: number;
  downloadUrl?: string;
}

interface OneDriveFoldersProps {
  empresaId?: string;
  sucursalId?: string;
  sucursalNombre?: string;
  empresaNombre?: string;
  filterBySucursal?: boolean;
  filterByEmpresa?: boolean;
}

export default function OneDriveFolders({ empresaId, sucursalId, sucursalNombre, empresaNombre, filterBySucursal = false, filterByEmpresa = false }: OneDriveFoldersProps) {
  const [items, setItems] = useState<OneDriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<Array<{ id: string; name: string }>>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const isFetchingRef = useRef(false);
  const router = useRouter();
  
  // Obtener sucursales si estamos filtrando por empresa
  const { sucursales } = useSucursales(filterByEmpresa && empresaId ? empresaId : undefined);

  const fetchFolders = useCallback(async (folderId?: string, isNavigation: boolean = false, forceRefresh: boolean = false) => {
    if (isFetchingRef.current && !forceRefresh) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      // Agregar timestamp para evitar caché del navegador
      const timestamp = forceRefresh ? `&_t=${Date.now()}` : '';
      const cacheHeaders: RequestInit = {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      };

      let response;
      
      // Si estamos navegando dentro de una carpeta
      if (isNavigation && folderId) {
        console.log('🔍 [OneDrive] Navigating to folder:', folderId);
        response = await fetch(`/api/onedrive/folders?action=list-folder-contents&folderId=${folderId}${timestamp}`, cacheHeaders);
      } else if (filterByEmpresa && empresaNombre) {
        // Buscar la carpeta de la empresa - primero en la raíz (más confiable)
        console.log('🔍 [OneDrive] Fetching folders for empresa:', empresaNombre);
        console.log('📂 [OneDrive] Step 1: Searching in root folders first...');
        
        const empresaNombreLower = empresaNombre.toLowerCase().trim();
        let empresaFolder: OneDriveFolder | null = null;
        
        // Primero buscar directamente en la raíz (más confiable)
        const rootResponse = await fetch(`/api/onedrive/folders?action=list-root-folders${timestamp}`, cacheHeaders);
        const rootData = await rootResponse.json();
        
        console.log('📥 [OneDrive] Root folders response:', rootData);
        
        // Verificar si hay error de autenticación
        if (!rootResponse.ok && (rootResponse.status === 401 || rootData.error?.includes('Not authenticated') || rootData.error?.includes('No tokens found'))) {
          console.log('🔒 [OneDrive] Authentication required');
          setError('Not authenticated');
          setItems([]);
          return;
        }
        
        if (rootResponse.ok && rootData.success && rootData.folders && rootData.folders.length > 0) {
          console.log('✅ [OneDrive] Root folders found:', rootData.folders.length);
          console.log('📋 [OneDrive] Root folder names:', rootData.folders.map((f: OneDriveFolder) => f.name));
          
          // Buscar la carpeta exacta (comparación case-insensitive)
          empresaFolder = rootData.folders.find((f: OneDriveFolder) => 
            f.name.toLowerCase().trim() === empresaNombreLower
          ) || null;
          
          // Si no se encuentra exacta, buscar la que contiene el nombre
          if (!empresaFolder) {
            empresaFolder = rootData.folders.find((f: OneDriveFolder) => 
              f.name.toLowerCase().trim().includes(empresaNombreLower) ||
              empresaNombreLower.includes(f.name.toLowerCase().trim())
            ) || null;
          }
          
          if (empresaFolder) {
            console.log('✅ [OneDrive] Found empresa folder in root:', empresaFolder.name, 'ID:', empresaFolder.id);
          } else {
            console.log('⚠️ [OneDrive] Empresa folder not found in root, trying search API...');
          }
        } else {
          console.log('⚠️ [OneDrive] Failed to get root folders, trying search API...');
        }
        
        // Si no se encontró en la raíz, intentar con la búsqueda
        if (!empresaFolder) {
          console.log('🔍 [OneDrive] Step 2: Trying search API...');
          const searchResponse = await fetch(`/api/onedrive/folders?action=search-folder&folderName=${encodeURIComponent(empresaNombre)}${timestamp}`, cacheHeaders);
          const searchData = await searchResponse.json();
          
          console.log('📥 [OneDrive] Search response:', searchData);
          
          // Verificar si hay error de autenticación en la búsqueda
          if (!searchResponse.ok && (searchResponse.status === 401 || searchData.error?.includes('Not authenticated') || searchData.error?.includes('No tokens found'))) {
            console.log('🔒 [OneDrive] Authentication required in search');
            setError('Not authenticated');
            setItems([]);
            return;
          }
          
          if (searchResponse.ok && searchData.success && searchData.folders && searchData.folders.length > 0) {
            console.log('✅ [OneDrive] Search found folders:', searchData.folders.length, 'matches');
            console.log('📋 [OneDrive] Search folder names:', searchData.folders.map((f: OneDriveFolder) => f.name));
            
            // Buscar la carpeta exacta
            empresaFolder = searchData.folders.find((f: OneDriveFolder) => 
              f.name.toLowerCase().trim() === empresaNombreLower
            ) || null;
            
            // Si no se encuentra exacta, buscar la que contiene el nombre
            if (!empresaFolder) {
              empresaFolder = searchData.folders.find((f: OneDriveFolder) => 
                f.name.toLowerCase().trim().includes(empresaNombreLower) ||
                empresaNombreLower.includes(f.name.toLowerCase().trim())
              ) || null;
            }
            
            if (empresaFolder) {
              console.log('✅ [OneDrive] Found empresa folder via search:', empresaFolder.name, 'ID:', empresaFolder.id);
            }
          }
        }
        
        // Si encontramos la carpeta, listar su contenido
        if (empresaFolder) {
          console.log('📁 [OneDrive] Listing contents of empresa folder:', empresaFolder.name);
          response = await fetch(`/api/onedrive/folders?action=list-folder-contents&folderId=${empresaFolder.id}${timestamp}`, cacheHeaders);
        } else {
          // Verificar si el error fue por falta de autenticación antes de reportar carpeta no encontrada
          if (rootResponse.status === 401 || rootData.error?.includes('Not authenticated') || rootData.error?.includes('No tokens found')) {
            console.log('🔒 [OneDrive] Authentication required - root folders request failed');
            setError('Not authenticated');
            setItems([]);
            return;
          }
          
          // No se encontró la carpeta
          console.log('❌ [OneDrive] Empresa folder not found:', empresaNombre);
          console.log('📋 [OneDrive] Available root folders:', rootData.folders?.map((f: OneDriveFolder) => f.name) || 'none');
          setError(`No se encontró la carpeta "${empresaNombre}" en OneDrive. Por favor verifique que la carpeta existe con ese nombre exacto en la raíz.`);
          setItems([]);
          return;
        }
      } else if (filterBySucursal && (sucursalNombre || sucursalId)) {
        // Buscar carpetas que coincidan con la sucursal
        console.log('🔍 [OneDrive] Fetching folders for sucursal:', sucursalNombre || sucursalId);
        const searchTerm = sucursalNombre || sucursalId || '';
        response = await fetch(`/api/onedrive/folders?action=search-folder&folderName=${encodeURIComponent(searchTerm)}${timestamp}`, cacheHeaders);
      } else {
        // Listar carpetas raíz
        console.log('🔍 [OneDrive] Fetching root folders');
        response = await fetch(`/api/onedrive/folders?action=list-root-folders${timestamp}`, cacheHeaders);
      }

      const data = await response.json();
      
      console.log('📥 [OneDrive] API Response status:', response.status, response.ok);
      console.log('📥 [OneDrive] API Response data:', data);

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to fetch folders';
        console.error('❌ [OneDrive] API Error:', errorMsg);
        
        // Si es un error de autenticación, guardar información adicional
        if (response.status === 401 || errorMsg.includes('Not authenticated') || errorMsg.includes('No tokens found')) {
          setError('Not authenticated');
          setItems([]);
          return;
        }
        
        throw new Error(errorMsg);
      }

      if (data.success) {
        let processedItems = data.folders || data.items || [];
        
        console.log('🔄 [OneDrive] Processing items:', processedItems.length, 'raw items');
        console.log('🔄 [OneDrive] Data structure:', {
          hasFolders: !!data.folders,
          hasItems: !!data.items,
          foldersLength: data.folders?.length || 0,
          itemsLength: data.items?.length || 0
        });
        
        // Si es contenido de carpeta (navigation o filterByEmpresa), convertir items al formato correcto
        if ((isNavigation || filterByEmpresa) && data.items) {
          console.log('🔄 [OneDrive] Processing folder contents (items)');
          // NO filtrar archivos, mostrar ambos (carpetas y archivos)
          processedItems = data.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            type: item.type || (item.folder ? 'folder' : 'file'),
            childCount: item.type === 'folder' || item.folder ? (item.childCount || 0) : undefined,
            webUrl: item.webUrl,
            size: item.type === 'file' && !item.folder ? item.size : undefined,
            downloadUrl: item.type === 'file' && !item.folder ? (item.downloadUrl || item.url) : undefined
          }));
        } else if (data.folders) {
          console.log('🔄 [OneDrive] Processing folders list');
          // Si viene como folders, asegurarse de que tengan el tipo correcto
          processedItems = processedItems.map((folder: any) => ({
            ...folder,
            type: 'folder'
          }));
        }
        
        // Ordenar: carpetas primero, luego archivos
        processedItems.sort((a: OneDriveItem, b: OneDriveItem) => {
          if (a.type === 'folder' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'folder') return 1;
          return a.name.localeCompare(b.name);
        });
        
        // Filtrar solo carpetas que coincidan con el nombre de la sucursal
        if (filterBySucursal && sucursalNombre && !isNavigation) {
          processedItems = processedItems.filter((item: OneDriveItem) => 
            item.type === 'folder' && (
              item.name.toLowerCase().includes(sucursalNombre.toLowerCase()) ||
              sucursalNombre.toLowerCase().includes(item.name.toLowerCase())
            )
          );
        }
        
        setItems(processedItems);
        setCurrentFolderId(folderId || null);
        // Limpiar error si la búsqueda fue exitosa
        setError(null);
        console.log('✅ [OneDrive] Items loaded:', processedItems.length, '(folders:', processedItems.filter((i: OneDriveItem) => i.type === 'folder').length, ', files:', processedItems.filter((i: OneDriveItem) => i.type === 'file').length, ')');
        
        if (processedItems.length === 0 && filterByEmpresa) {
          console.warn('⚠️ [OneDrive] No items found in empresa folder. This might be normal if the folder is empty.');
        }
      } else {
        const errorMsg = data.error || 'Unknown error occurred';
        console.error('❌ [OneDrive] API returned success=false:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('❌ [OneDrive] Error fetching folders:', err);
      setError(err.message || 'Failed to load folders');
      setItems([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [filterByEmpresa, filterBySucursal, empresaNombre, sucursalNombre, sucursalId]);

  useEffect(() => {
    // Fetch folders when empresaNombre or sucursalNombre changes
    fetchFolders();
  }, [empresaNombre, empresaId, sucursalNombre, sucursalId, fetchFolders]);

  const navigateToFolder = useCallback((folderId: string, folderName: string) => {
    // Siempre navegar dentro de la carpeta normalmente, sin importar si es una sucursal o no
    console.log('📁 [OneDrive] Navegando dentro de carpeta:', folderName);
    setFolderHistory(prev => [...prev, { id: folderId, name: folderName }]);
    // Limpiar items antes de navegar para evitar mostrar datos obsoletos
    setItems([]);
    fetchFolders(folderId, true, true);
  }, [fetchFolders]);

  const navigateBack = useCallback(() => {
    if (folderHistory.length > 0) {
      const newHistory = [...folderHistory];
      newHistory.pop();
      setFolderHistory(newHistory);
      
      if (newHistory.length === 0) {
        // Volver a la carpeta inicial
        fetchFolders();
      } else {
        // Navegar a la carpeta anterior
        const previousFolder = newHistory[newHistory.length - 1];
        fetchFolders(previousFolder.id, true);
      }
    } else {
      // Volver a la carpeta inicial
      fetchFolders();
    }
  }, [folderHistory, fetchFolders]);

  const handleRefresh = () => {
    // Limpiar el estado antes de refrescar para forzar actualización
    setItems([]);
    setCurrentFolderId(null);
    setFolderHistory([]);
    // Forzar refresh con timestamp único
    fetchFolders(undefined, false, true);
  };

  if (loading && items.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-6 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
        
        {/* Skeleton de barra de búsqueda */}
        <div className="mb-6">
          <div className="h-10 bg-gray-200 rounded-lg w-full animate-pulse"></div>
        </div>

        {/* Skeleton de tabla */}
        <div className="rounded-md border border-gray-200 shadow-md">
          <div className="px-6 py-4 border-b bg-gray-50 border-gray-100">
            <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-sm mb-6">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar carpetas </h3>
          <p className="text-red-600 mb-4">{error}</p>
          {error.includes('Not authenticated') && (
            <a
              href="/api/auth/login"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Iniciar Sesión con OneDrive
            </a>
          )}
        </div>
      </div>
    );
  }

  // Filtrar items basado en el término de búsqueda
  const filteredItems = searchTerm.trim() === '' 
    ? items 
    : items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
      );

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-medium text-gray-900">
              {filterByEmpresa && empresaNombre 
                ? `Sucursales de   ${empresaNombre}` 
                : filterBySucursal && sucursalNombre 
                ? `Sucursales de   - ${sucursalNombre}` 
                : 'Sucursales de  '}
            </h3>
            {folderHistory.length > 0 && (
              <button
                onClick={navigateBack}
                className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                title="Volver"
              >
                ← Volver
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {filterByEmpresa && empresaNombre
              ? `Sucursales  de ${empresaNombre}`
              : filterBySucursal && sucursalNombre 
              ? `Carpetas relacionadas con ${sucursalNombre}` 
              : 'Carpetas disponibles en el nivel raíz'}
          </p>
          {folderHistory.length > 0 && (
            <div className="flex items-center space-x-1 mt-1">
              <span className="text-xs text-gray-400">Ubicación actual:</span>
              {folderHistory.map((folder, index) => (
                <span key={folder.id} className="text-xs text-gray-600">
                  {folder.name}
                  {index < folderHistory.length - 1 && <span className="mx-1">/</span>}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500">
            {searchTerm.trim() ? (
              <span>
                {filteredItems.length} de {items.length} elemento{items.length !== 1 ? 's' : ''}
              </span>
            ) : (
              <span>
                {items.length} elemento{items.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
            placeholder="Buscar archivos y carpetas..."
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              title="Limpiar búsqueda"
            >
              <svg
                className="h-5 w-5 text-gray-400 hover:text-gray-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {(items.length === 0 && !loading) || (searchTerm.trim() && filteredItems.length === 0 && items.length > 0) ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm.trim() && filteredItems.length === 0 && items.length > 0
              ? 'No se encontraron resultados'
              : error 
              ? 'Error al cargar carpetas' 
              : 'No hay carpetas disponibles'}
          </h4>
          <p className="text-gray-500">
            {searchTerm.trim() && filteredItems.length === 0 && items.length > 0
              ? `No se encontraron archivos o carpetas que coincidan con "${searchTerm}"`
              : error || (filterByEmpresa && empresaNombre 
                ? `No se encontraron carpetas en "${empresaNombre}"`
                : filterBySucursal && sucursalNombre
                ? `No se encontraron carpetas relacionadas con "${sucursalNombre}"`
                : 'No se encontraron carpetas en el nivel raíz de OneDrive')}
          </p>
          {error && filterByEmpresa && empresaNombre && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Sugerencia:</strong> Asegúrese de que existe una carpeta con el nombre exacto "{empresaNombre}" en OneDrive.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {items.length === 0 && !loading && !searchTerm.trim() && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            {error ? 'Error al cargar carpetas' : 'No hay carpetas disponibles'}
          </h4>
          <p className="text-gray-500">
            {error || (filterByEmpresa && empresaNombre 
              ? `No se encontraron carpetas en "${empresaNombre}"`
              : filterBySucursal && sucursalNombre
              ? `No se encontraron carpetas relacionadas con "${sucursalNombre}"`
              : 'No se encontraron carpetas en el nivel raíz de OneDrive')}
          </p>
          {error && filterByEmpresa && empresaNombre && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Sugerencia:</strong> Asegúrese de que existe una carpeta con el nombre exacto "{empresaNombre}" en OneDrive.
              </p>
            </div>
          )}
        </div>
      )}
      {/* Skeleton cuando está cargando pero ya hay items (navegación entre carpetas) */}
      {loading && items.length > 0 ? (
        <div className="w-full">
          <div className="rounded-md border border-gray-200 shadow-md">
            <div className="px-6 py-4 border-b bg-gray-50 border-gray-100">
              <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
            </div>
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100">
                  <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="w-full">
          <div className="rounded-md border border-gray-200 shadow-md">
            <div className="px-6 py-4 border-b bg-gray-50 border-gray-100 text-gray-500">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {currentFolderId || filterByEmpresa ? 'Documentación' : 'Documentación'}
                </h3>

              </div>
            </div>

            <div className="relative text-gray-500 overflow-x-auto">
              <table className="w-full text-gray-500 caption-bottom text-sm">
                <thead className="border-gray-200">
                  <tr className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0">
                      Nombre
                    </th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredItems.map((item) => {
                    const getFileIcon = (fileName: string): string => {
                      const extension = fileName.split('.').pop()?.toLowerCase() || '';
                      switch (extension) {
                        case 'pdf': return '📄';
                        case 'doc':
                        case 'docx': return '📝';
                        case 'xls':
                        case 'xlsx': return '📊';
                        case 'ppt':
                        case 'pptx': return '📋';
                        case 'jpg':
                        case 'jpeg':
                        case 'png':
                        case 'gif': return '🖼️';
                        case 'zip':
                        case 'rar': return '🗜️';
                        case 'txt': return '📃';
                        default: return '📄';
                      }
                    };

                    const formatFileSize = (bytes?: number): string => {
                      if (!bytes) return '-';
                      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                      const i = Math.floor(Math.log(bytes) / Math.log(1024));
                      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
                    };

                    // Verificar si esta carpeta es una sucursal (funciona en cualquier nivel de navegación)
                    const itemNameLower = item.name.toLowerCase().trim();
                    const isSucursal = filterByEmpresa && empresaId && item.type === 'folder' && sucursales.some(s => {
                      const sucursalNombreLower = s.nombre.toLowerCase().trim();
                      const sucursalIdLower = s.id.toLowerCase().trim();
                      
                      // Comparaciones exactas
                      if (sucursalNombreLower === itemNameLower || sucursalIdLower === itemNameLower) {
                        return true;
                      }
                      
                      // Verificar si contiene o empieza con el ID/nombre de la sucursal
                      if (itemNameLower.includes(sucursalIdLower) || sucursalIdLower.includes(itemNameLower)) {
                        return true;
                      }
                      
                      if (itemNameLower.startsWith(sucursalIdLower) || sucursalIdLower.startsWith(itemNameLower)) {
                        return true;
                      }
                      
                      return false;
                    });
                    
                    const sucursal = isSucursal ? sucursales.find(s => {
                      const sucursalNombreLower = s.nombre.toLowerCase().trim();
                      const sucursalIdLower = s.id.toLowerCase().trim();
                      
                      if (sucursalNombreLower === itemNameLower || sucursalIdLower === itemNameLower) {
                        return true;
                      }
                      
                      if (itemNameLower.includes(sucursalIdLower) || sucursalIdLower.includes(itemNameLower)) {
                        return true;
                      }
                      
                      if (itemNameLower.startsWith(sucursalIdLower) || sucursalIdLower.startsWith(itemNameLower)) {
                        return true;
                      }
                      
                      return false;
                    }) : null;

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-100 transition-colors ${
                          item.type === 'folder' 
                            ? 'hover:bg-gray-100 cursor-pointer bg-white'
                            : 'hover:bg-gray-50 bg-white'
                        }`}
                        onClick={item.type === 'folder' ? () => navigateToFolder(item.id, item.name) : undefined}
                      >
                        <td className="p-4 align-middle font-medium">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              item.type === 'folder' 
                                ? 'bg-gray-200'
                                : 'bg-gray-100'
                            }`}>
                              <span className="text-lg">
                                {item.type === 'folder' ? '📁' : getFileIcon(item.name)}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.type === 'file' ? (
                              <>
                                {item.webUrl && (
                                  <a
                                    href={item.webUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-gray-300 hover:bg-gray-50 hover:text-gray-900 h-9 px-3"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Previsualizar archivo en OneDrive"
                                  >
                                    Ver
                                  </a>
                                )}
                                {item.downloadUrl && (
                                  <a
                                    href={item.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-gray-500 text-white hover:bg-gray-600 h-9 px-3"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Descargar archivo"
                                  >
                                    Descargar
                                  </a>
                                )}
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

