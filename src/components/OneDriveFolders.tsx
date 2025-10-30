'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
  const isFetchingRef = useRef(false);

  const fetchFolders = useCallback(async (folderId?: string, isNavigation: boolean = false) => {
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      let response;
      
      // Si estamos navegando dentro de una carpeta
      if (isNavigation && folderId) {
        console.log('🔍 [OneDrive] Navigating to folder:', folderId);
        response = await fetch(`/api/onedrive/folders?action=list-folder-contents&folderId=${folderId}`);
      } else if (filterByEmpresa && empresaNombre) {
        // Buscar la carpeta de la empresa primero
        console.log('🔍 [OneDrive] Fetching folders for empresa:', empresaNombre);
        const searchResponse = await fetch(`/api/onedrive/folders?action=search-folder&folderName=${encodeURIComponent(empresaNombre)}`);
        const searchData = await searchResponse.json();
        
        if (searchData.success && searchData.folders.length > 0) {
          // Encontrar la carpeta exacta de la empresa
          const empresaFolder = searchData.folders.find((f: OneDriveFolder) => 
            f.name.toLowerCase() === empresaNombre.toLowerCase()
          );
          
          if (empresaFolder) {
            // Listar contenido dentro de la carpeta de la empresa
            console.log('📁 [OneDrive] Found empresa folder, fetching contents:', empresaFolder.id);
            response = await fetch(`/api/onedrive/folders?action=list-folder-contents&folderId=${empresaFolder.id}`);
          } else {
            // Si no se encuentra la carpeta exacta, usar la primera que se encontró
            const firstFolder = searchData.folders[0];
            console.log('📁 [OneDrive] Using first match, fetching contents:', firstFolder.id);
            response = await fetch(`/api/onedrive/folders?action=list-folder-contents&folderId=${firstFolder.id}`);
          }
        } else {
          // No se encontró la carpeta de la empresa, devolver vacío
          setItems([]);
          return;
        }
      } else if (filterBySucursal && (sucursalNombre || sucursalId)) {
        // Buscar carpetas que coincidan con la sucursal
        console.log('🔍 [OneDrive] Fetching folders for sucursal:', sucursalNombre || sucursalId);
        const searchTerm = sucursalNombre || sucursalId || '';
        response = await fetch(`/api/onedrive/folders?action=search-folder&folderName=${encodeURIComponent(searchTerm)}`);
      } else {
        // Listar carpetas raíz
        console.log('🔍 [OneDrive] Fetching root folders');
        response = await fetch('/api/onedrive/folders?action=list-root-folders');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch folders');
      }

      if (data.success) {
        let processedItems = data.folders || data.items || [];
        
        // Si es contenido de carpeta (navigation o filterByEmpresa), convertir items al formato correcto
        if ((isNavigation || filterByEmpresa) && data.items) {
          // NO filtrar archivos, mostrar ambos (carpetas y archivos)
          processedItems = processedItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            childCount: item.type === 'folder' ? (item.childCount || 0) : undefined,
            webUrl: item.webUrl,
            size: item.type === 'file' ? item.size : undefined,
            downloadUrl: item.type === 'file' ? (item.downloadUrl || item.url) : undefined
          }));
        } else if (data.folders) {
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
        console.log('✅ [OneDrive] Items loaded:', processedItems.length, '(folders:', processedItems.filter((i: OneDriveItem) => i.type === 'folder').length, ', files:', processedItems.filter((i: OneDriveItem) => i.type === 'file').length, ')');
      } else {
        throw new Error(data.error || 'Unknown error occurred');
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
    setFolderHistory(prev => [...prev, { id: folderId, name: folderName }]);
    fetchFolders(folderId, true);
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
    fetchFolders();
  };

  if (loading && items.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
          <span className="ml-2 text-gray-600">Cargando carpetas de OneDrive...</span>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar carpetas de OneDrive</h3>
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
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-medium text-gray-900">
              {filterByEmpresa && empresaNombre 
                ? `Carpetas de OneDrive - ${empresaNombre}` 
                : filterBySucursal && sucursalNombre 
                ? `Carpetas de OneDrive - ${sucursalNombre}` 
                : 'Carpetas de OneDrive'}
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
              ? `Carpetas dentro de ${empresaNombre}`
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
            {items.length} elemento{items.length !== 1 ? 's' : ''}
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

      {items.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No hay carpetas disponibles</h4>
          <p className="text-gray-500">
            No se encontraron carpetas en el nivel raíz de OneDrive
          </p>
        </div>
      ) : (
        <div className="w-full">
          <div className="rounded-md border border-gray-200 shadow-md">
            <div className="px-6 py-4 border-b bg-gray-50 border-gray-100 text-gray-500">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {currentFolderId || filterByEmpresa ? 'Archivos y Carpetas' : 'Carpetas'}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{items.length} elementos</span>
                </div>
              </div>
            </div>

            <div className="relative text-gray-500 overflow-x-auto">
              <table className="w-full text-gray-500 caption-bottom text-sm">
                <thead className="border-gray-200">
                  <tr className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0">
                      Nombre
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0">
                      {currentFolderId || filterByEmpresa ? 'Tamaño' : 'Elementos'}
                    </th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {items.map((item) => {
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

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-100 transition-colors ${
                          item.type === 'folder' 
                            ? 'hover:bg-gray-100 cursor-pointer bg-gray-50' 
                            : 'hover:bg-gray-50 bg-white'
                        }`}
                        onClick={item.type === 'folder' ? () => navigateToFolder(item.id, item.name) : undefined}
                      >
                        <td className="p-4 align-middle font-medium">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              item.type === 'folder' ? 'bg-gray-200' : 'bg-gray-100'
                            }`}>
                              <span className="text-lg">
                                {item.type === 'folder' ? '📁' : getFileIcon(item.name)}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">{item.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          {item.type === 'folder' ? (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{item.childCount || 0}</span>
                              <span className="text-xs text-gray-600">elementos</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-xs">{formatFileSize(item.size)}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.type === 'file' && item.downloadUrl ? (
                              <>
                                <a
                                  href={item.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-gray-300 hover:bg-gray-50 hover:text-gray-900 h-9 px-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Ver
                                </a>
                                <a
                                  href={item.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-gray-500 text-white hover:bg-gray-600 h-9 px-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Descargar
                                </a>
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
      )}
    </div>
  );
}

