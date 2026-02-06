'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSucursales } from '@/hooks/useSucursales';
import { useMediciones } from '@/hooks/useMediciones';

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
  const [sortBy, setSortBy] = useState<'name' | 'cobertura' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const isFetchingRef = useRef(false);
  const router = useRouter();
  
  // Obtener sucursales si estamos filtrando por empresa
  const { sucursales } = useSucursales(filterByEmpresa && empresaId ? empresaId : undefined);
  
  // Obtener mediciones de todas las sucursales para calcular porcentaje de cobertura legal
  const { mediciones: allMediciones } = useMediciones(filterByEmpresa && empresaId ? empresaId : undefined);
  
  // Función helper para formatear el porcentaje (quitar 0 inicial si existe)
  const formatearPorcentaje = (valor: string | number | null): string | null => {
    if (!valor) return null;
    
    const numValue = typeof valor === 'string' 
      ? parseFloat(valor.replace('%', '').replace(',', '.').trim())
      : valor;
    
    if (isNaN(numValue)) return null;
    
    // Si el valor es < 1 (tiene 0 inicial), quitar el 0 y mostrar el resto
    if (numValue < 1 && numValue > 0) {
      // Multiplicar por 100 y redondear
      return Math.round(numValue * 100).toString();
    }
    
    // Si es >= 1, mostrar tal cual (redondeado)
    return Math.round(numValue).toString();
  };
  
  // Mapa de sucursalId -> porcentaje de cobertura legal
  const porcentajesPorSucursal = useMemo(() => {
    const mapa = new Map<string, string | null>();
    
    if (!filterByEmpresa || !empresaId) return mapa;
    
    // Agrupar mediciones por sucursal
    const medicionesPorSucursal = new Map<string, typeof allMediciones>();
    allMediciones.forEach((m) => {
      if (m.sucursalId) {
        if (!medicionesPorSucursal.has(m.sucursalId)) {
          medicionesPorSucursal.set(m.sucursalId, []);
        }
        medicionesPorSucursal.get(m.sucursalId)!.push(m);
      }
    });
    
    // Para cada sucursal, obtener el porcentaje más reciente
    medicionesPorSucursal.forEach((medicionesSucursal, sucursalId) => {
      let valor: string | null = null;
      
      // Buscar el valor en las mediciones (priorizando la más reciente)
      for (const m of medicionesSucursal) {
        const datos = m.datos as Record<string, unknown>;
        const getValue = (k: string) => String((datos[k] ?? '') as any).trim();
        
        const coberturaValue = getValue('PORCENTAJE DE COBERTURA LEGAL');
        
        if (coberturaValue && coberturaValue !== '' && coberturaValue !== 'undefined' && coberturaValue !== 'null') {
          valor = formatearPorcentaje(coberturaValue);
          break; // Usar el primer valor encontrado (más reciente)
        }
      }
      
      if (valor !== null) {
        mapa.set(sucursalId, valor);
      }
    });
    
    return mapa;
  }, [allMediciones, filterByEmpresa, empresaId]);

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

  // Función para manejar el ordenamiento
  const handleSort = useCallback((type: 'name' | 'cobertura') => {
    if (sortBy === type) {
      // Si ya está ordenando por este criterio, cambiar el orden
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Si es un nuevo criterio, establecerlo y usar orden ascendente por defecto
      setSortBy(type);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  // Filtrar y ordenar items basado en el término de búsqueda y criterio de ordenamiento
  const filteredItems = useMemo(() => {
    let filtered = searchTerm.trim() === '' 
      ? items 
      : items.filter(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
        );
    
    // Ordenar items si hay un criterio de ordenamiento
    if (sortBy === 'cobertura' && filterByEmpresa && empresaId) {
      filtered = [...filtered].sort((a, b) => {
        // Obtener sucursales para ambos items
        const getSucursal = (item: OneDriveItem) => {
          if (item.type !== 'folder') return null;
          const itemNameLower = item.name.toLowerCase().trim();
          return sucursales.find(s => {
            const sucursalNombreLower = s.nombre.toLowerCase().trim();
            const sucursalIdLower = s.id.toLowerCase().trim();
            return sucursalNombreLower === itemNameLower || 
                   sucursalIdLower === itemNameLower ||
                   itemNameLower.includes(sucursalIdLower) || 
                   sucursalIdLower.includes(itemNameLower) ||
                   itemNameLower.startsWith(sucursalIdLower) || 
                   sucursalIdLower.startsWith(itemNameLower);
          });
        };
        
        const sucursalA = getSucursal(a);
        const sucursalB = getSucursal(b);
        
        const porcentajeA = sucursalA ? porcentajesPorSucursal.get(sucursalA.id) : null;
        const porcentajeB = sucursalB ? porcentajesPorSucursal.get(sucursalB.id) : null;
        
        // Convertir a números para comparar
        const numA = porcentajeA ? parseFloat(porcentajeA) : -1; // -1 para que los sin porcentaje vayan al final
        const numB = porcentajeB ? parseFloat(porcentajeB) : -1;
        
        if (sortOrder === 'asc') {
          return numA - numB; // Ascendente (menor a mayor)
        } else {
          return numB - numA; // Descendente (mayor a menor)
        }
      });
    } else if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => {
        if (sortOrder === 'asc') {
          return a.name.localeCompare(b.name);
        } else {
          return b.name.localeCompare(a.name);
        }
      });
    }
    
    return filtered;
  }, [items, searchTerm, sortBy, sortOrder, filterByEmpresa, empresaId, sucursales, porcentajesPorSucursal]);

  if (loading && items.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
          <div className="flex-1">
            <div className="h-5 sm:h-6 bg-gray-200 rounded w-48 sm:w-64 mb-2 animate-pulse"></div>
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-32 sm:w-48 animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-20 sm:w-24 animate-pulse"></div>
        </div>
        
        {/* Skeleton de barra de búsqueda */}
        <div className="mb-4 sm:mb-6">
          <div className="h-11 sm:h-10 bg-gray-200 rounded-lg w-full animate-pulse"></div>
        </div>

        {/* Skeleton de tabla (desktop) */}
        <div className="hidden sm:block rounded-md border border-gray-200 shadow-md">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gray-50 border-gray-100">
            <div className="h-5 sm:h-6 bg-gray-200 rounded w-32 sm:w-40 animate-pulse"></div>
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

        {/* Skeleton de cards (mobile) */}
        <div className="sm:hidden space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
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

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
              {filterByEmpresa && empresaNombre 
                ? `Sucursales de ${empresaNombre}` 
                : filterBySucursal && sucursalNombre 
                ? `Sucursales - ${sucursalNombre}` 
                : 'Sucursales'}
            </h3>
            {folderHistory.length > 0 && (
              <button
                onClick={navigateBack}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors active:bg-gray-300 flex-shrink-0"
                title="Volver"
              >
                ← Volver
              </button>
            )}
          </div>
         
          {folderHistory.length > 0 && (
            <div className="flex items-center space-x-1 mt-1 overflow-x-auto pb-1">
              <span className="text-xs text-gray-400 flex-shrink-0">Ubicación:</span>
              <div className="flex items-center space-x-1 min-w-0">
                {folderHistory.map((folder, index) => (
                  <span key={folder.id} className="text-xs text-gray-600 whitespace-nowrap">
                    {folder.name}
                    {index < folderHistory.length - 1 && <span className="mx-1">/</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
            {searchTerm.trim() ? (
              <span>
                {filteredItems.length}/{items.length}
              </span>
            ) : (
              <span>
                {items.length} {items.length !== 1 ? 'items' : 'item'}
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:bg-gray-300 flex-shrink-0"
          >
            {loading ? '...' : '🔄'}
          </button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-4 sm:mb-6">
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
            className="block w-full pl-10 pr-10 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            placeholder="Buscar archivos y carpetas..."
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center active:opacity-70"
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
          {/* Desktop: Tabla */}
          <div className="hidden sm:block rounded-md border border-gray-200 shadow-md">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gray-50 border-gray-100 text-gray-500">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold">
                  {currentFolderId || filterByEmpresa ? 'Documentación' : 'Documentación'}
                </h3>
              </div>
            </div>

            <div className="relative text-gray-500 overflow-x-auto">
              <table className="w-full text-gray-500 caption-bottom text-sm">
                <thead className="border-gray-200">
                  <tr className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 hover:text-gray-900 transition-colors px-2 py-1 rounded hover:bg-gray-100"
                        title="Ordenar por nombre"
                      >
                        <span>Nombre</span>
                        <div className="flex flex-col">
                          <svg 
                            className={`w-3 h-3 ${sortBy === 'name' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M5 12l5-5 5 5H5z" />
                          </svg>
                          <svg 
                            className={`w-3 h-3 -mt-1 ${sortBy === 'name' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M5 8l5 5 5-5H5z" />
                          </svg>
                        </div>
                      </button>
                    </th>
                    {filterByEmpresa && empresaId && (
                      <th className="h-12 px-4 text-center align-middle font-medium text-gray-600">
                        <button
                          onClick={() => handleSort('cobertura')}
                          className="flex items-center justify-center gap-2 hover:text-gray-900 transition-all mx-auto px-3 py-2 rounded-md hover:bg-gray-100 border border-transparent hover:border-gray-300"
                          title={sortBy === 'cobertura' 
                            ? sortOrder === 'asc' 
                              ? 'Ordenar: Menor a Mayor (click para cambiar)' 
                              : 'Ordenar: Mayor a Menor (click para cambiar)'
                            : 'Click para ordenar por porcentaje'}
                        >
                          <span className="font-medium">Cobertura Legal</span>
                          <div className="flex flex-col items-center">
                            <svg 
                              className={`w-3 h-3 ${sortBy === 'cobertura' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path d="M5 12l5-5 5 5H5z" />
                            </svg>
                            <svg 
                              className={`w-3 h-3 -mt-1 ${sortBy === 'cobertura' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path d="M5 8l5 5 5-5H5z" />
                            </svg>
                          </div>
                          {sortBy === 'cobertura' && (
                            <span className="text-xs text-blue-600 font-semibold ml-1">
                              {sortOrder === 'asc' ? '(↑)' : '(↓)'}
                            </span>
                          )}
                        </button>
                      </th>
                    )}
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
                    
                    // Obtener el porcentaje de cobertura legal para esta sucursal
                    const porcentajeCobertura = sucursal ? porcentajesPorSucursal.get(sucursal.id) : null;
                    
                    // Si es una sucursal, redirigir a la página de detalle de la sucursal
                    const handleFolderClick = () => {
                      if (isSucursal && sucursal && empresaId) {
                        router.push(`/dashboard/empresas/${encodeURIComponent(empresaId)}/sucursales/${encodeURIComponent(sucursal.id)}`);
                      } else if (item.type === 'folder') {
                        navigateToFolder(item.id, item.name);
                      }
                    };

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-100 transition-colors ${
                          item.type === 'folder' 
                            ? 'hover:bg-gray-100 cursor-pointer bg-white'
                            : 'hover:bg-gray-50 bg-white'
                        }`}
                        onClick={item.type === 'folder' ? handleFolderClick : undefined}
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
                        {filterByEmpresa && empresaId && (
                          <td className="p-4 align-middle text-center">
                            {isSucursal && porcentajeCobertura !== null ? (
                              <span className="font-semibold text-gray-700">{porcentajeCobertura}%</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
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

          {/* Mobile: Cards */}
          <div className="sm:hidden space-y-3">
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

              // Verificar si esta carpeta es una sucursal
              const itemNameLower = item.name.toLowerCase().trim();
              const isSucursal = filterByEmpresa && empresaId && item.type === 'folder' && sucursales.some(s => {
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
              });
              
              const sucursalMobile = isSucursal ? sucursales.find(s => {
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
              
              // Obtener el porcentaje de cobertura legal para esta sucursal (mobile)
              const porcentajeCoberturaMobile = sucursalMobile ? porcentajesPorSucursal.get(sucursalMobile.id) : null;
              
              // Si es una sucursal, redirigir a la página de detalle de la sucursal
              const handleFolderClickMobile = () => {
                if (isSucursal && sucursalMobile && empresaId) {
                  router.push(`/dashboard/empresas/${encodeURIComponent(empresaId)}/sucursales/${encodeURIComponent(sucursalMobile.id)}`);
                } else if (item.type === 'folder') {
                  navigateToFolder(item.id, item.name);
                }
              };

              return (
                <div
                  key={item.id}
                  className={`border border-gray-200 rounded-lg p-4 transition-colors ${
                    item.type === 'folder' 
                      ? 'bg-white active:bg-gray-50 cursor-pointer'
                      : 'bg-gray-50'
                  }`}
                  onClick={item.type === 'folder' ? handleFolderClickMobile : undefined}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.type === 'folder' 
                        ? 'bg-blue-50'
                        : 'bg-gray-100'
                    }`}>
                      <span className="text-2xl">
                        {item.type === 'folder' ? '📁' : getFileIcon(item.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 mb-1 break-words">
                        {item.name}
                      </div>
                      {isSucursal && porcentajeCoberturaMobile !== null && (
                        <div className="text-xs text-gray-500 mt-1">
                          Cobertura Legal: <span className="font-semibold text-gray-700">{porcentajeCoberturaMobile}%</span>
                        </div>
                      )}
                      {item.type === 'file' && item.size && (
                        <div className="text-xs text-gray-500">
                          {formatFileSize(item.size)}
                        </div>
                      )}
                     
                    </div>
                  </div>
                  {item.type === 'file' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      {item.webUrl && (
                        <a
                          href={item.webUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 h-10 px-4"
                          onClick={(e) => e.stopPropagation()}
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
                          className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 h-10 px-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Descargar
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

