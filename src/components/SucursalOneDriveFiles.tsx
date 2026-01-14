'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface OneDriveFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  url: string | null;
  size?: number;
  lastModified?: string;
  created?: string;
  webUrl?: string;
  childCount?: number;
}

interface SucursalOneDriveApiResponse {
  success: boolean;
  empresaId: string;
  sucursalId: string;
  empresaNombre: string;
  folderPath: string;
  folderId?: string;
  files: OneDriveFile[];
  totalFiles: number;
  message?: string;
  error?: string;
}

interface SucursalOneDriveFilesProps {
  empresaId: string;
  sucursalId: string;
}

export default function SucursalOneDriveFiles({ empresaId, sucursalId }: SucursalOneDriveFilesProps) {
  const [files, setFiles] = useState<OneDriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empresaNombre, setEmpresaNombre] = useState<string>('');
  const [folderPath, setFolderPath] = useState<string>('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<Array<{ id: string; name: string }>>([]);
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  const fetchFiles = useCallback(async (folderId?: string) => {
    // Evitar múltiples llamadas simultáneas
    if (isFetchingRef.current || !empresaId || !sucursalId) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      console.log('🔍 [OneDrive] Fetching files for:', empresaId, sucursalId, folderId ? `in folder ${folderId}` : '');

      let response;
      if (folderId) {
        // Fetch folder contents
        response = await fetch(`/api/onedrive/folder-contents?folderId=${encodeURIComponent(folderId)}&empresaId=${encodeURIComponent(empresaId)}&sucursalId=${encodeURIComponent(sucursalId)}`);
      } else {
        // Fetch initial sucursal files
        response = await fetch(`/api/onedrive/sucursal-files?empresaId=${encodeURIComponent(empresaId)}&sucursalId=${encodeURIComponent(sucursalId)}`);
      }

      const data: SucursalOneDriveApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch files');
      }

      if (data.success) {
        setFiles(data.files);
        setCurrentFolderId(folderId || null);
        
        if (!folderId) {
          // Solo actualizar estos valores en la carga inicial
          setEmpresaNombre(data.empresaNombre);
          setFolderPath(data.folderPath);
        }
        
        if (data.message) {
          console.log('ℹ️ [OneDrive]', data.message);
        }
        
        console.log('✅ [OneDrive] Files loaded:', data.files.length);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (err: any) {
      console.error('❌ [OneDrive] Error fetching files:', err);
      setError(err.message || 'Failed to load files');
      setFiles([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [empresaId, sucursalId]);

  const navigateToFolder = useCallback((folderId: string, folderName: string) => {
    setFolderHistory(prev => [...prev, { id: folderId, name: folderName }]);
    fetchFiles(folderId);
  }, [fetchFiles]);

  const navigateBack = useCallback(() => {
    if (folderHistory.length > 0) {
      const newHistory = [...folderHistory];
      newHistory.pop();
      setFolderHistory(newHistory);
      
      if (newHistory.length === 0) {
        // Volver a la carpeta inicial
        fetchFiles();
      } else {
        // Navegar a la carpeta anterior
        const previousFolder = newHistory[newHistory.length - 1];
        fetchFiles(previousFolder.id);
      }
    } else {
      // Volver a la carpeta inicial
      fetchFiles();
    }
  }, [folderHistory, fetchFiles]);

  useEffect(() => {
    // Solo fetch una vez cuando el componente se monta
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchFiles();
    }
  }, [fetchFiles]);

  const handleRefresh = () => {
    hasFetchedRef.current = false;
    fetchFiles();
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown date';
    
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (file: OneDriveFile): string => {
    if (file.type === 'folder') {
      return '📁';
    }
    
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📋';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'zip':
      case 'rar':
        return '🗜️';
      case 'txt':
        return '📃';
      default:
        return '📄';
    }
  };

  if (loading && files.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
          <div className="flex-1">
            <div className="h-5 sm:h-6 bg-gray-200 rounded w-48 sm:w-64 mb-2 animate-pulse"></div>
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-32 sm:w-48 animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-20 sm:w-24 animate-pulse"></div>
        </div>
        <div className="space-y-3">
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
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-red-200 shadow-sm mb-6">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Error al cargar archivos de OneDrive</h3>
          <p className="text-sm sm:text-base text-red-600 mb-4 px-2">{error}</p>
          {error.includes('Not authenticated') && (
            <a
              href="/api/auth/login"
              className="inline-block px-4 py-2.5 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors text-sm sm:text-base"
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
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Documentación de sucursal</h3>
            {folderHistory.length > 0 && (
              <button
                onClick={navigateBack}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 active:bg-gray-300 transition-colors flex-shrink-0 self-start sm:self-auto"
                title="Volver"
              >
                ← Volver
              </button>
            )}
          </div>
          {empresaNombre && (
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {empresaNombre} - {sucursalId}
            </p>
          )}
          
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
            {files.length} {files.length !== 1 ? 'items' : 'item'}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {loading ? '...' : '🔄'}
          </button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No hay archivos disponibles</h4>
          <p className="text-sm sm:text-base text-gray-500 px-2">
            No se encontraron archivos en la carpeta de OneDrive para esta sucursal
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className={`rounded-lg transition-colors ${
                file.type === 'folder' 
                  ? 'bg-white border-2 border-gray-300 active:bg-gray-50 cursor-pointer' 
                  : 'bg-gray-50 border border-gray-200'
              }`}
              onClick={file.type === 'folder' ? () => navigateToFolder(file.id, file.name) : undefined}
            >
              {/* Desktop Layout */}
              <div className="hidden sm:flex items-center justify-between p-4">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">
                    {getFileIcon(file)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      {file.type === 'folder' ? (
                        <span>{file.childCount || 0} elemento{(file.childCount || 0) !== 1 ? 's' : ''}</span>
                      ) : (
                        <span>{formatFileSize(file.size)}</span>
                      )}
                      {file.lastModified && (
                        <span>Modificado: {formatDate(file.lastModified)}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                  {file.type === 'folder' ? (
                    <span className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md">
                      Abrir carpeta
                    </span>
                  ) : file.url ? (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Descargar
                    </a>
                  ) : (
                    <span className="px-3 py-1.5 bg-gray-300 text-gray-500 text-sm rounded-md cursor-not-allowed">
                      No disponible
                    </span>
                  )}
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="sm:hidden p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    file.type === 'folder' 
                      ? 'bg-blue-50'
                      : 'bg-gray-100'
                  }`}>
                    <span className="text-2xl">
                      {getFileIcon(file)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 mb-1 break-words">
                      {file.name}
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      {file.type === 'folder' ? (
                        <div>{file.childCount || 0} elemento{(file.childCount || 0) !== 1 ? 's' : ''}</div>
                      ) : (
                        <div>{formatFileSize(file.size)}</div>
                      )}
                      {file.lastModified && (
                        <div className="text-xs">Modificado: {formatDate(file.lastModified)}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                {file.type === 'folder' ? (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 text-sm rounded-lg text-center font-medium">
                      Abrir carpeta →
                    </div>
                  </div>
                ) : file.url ? (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full px-4 py-2.5 bg-gray-600 text-white text-sm rounded-lg text-center font-medium hover:bg-gray-700 active:bg-gray-800 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Descargar
                    </a>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="w-full px-4 py-2.5 bg-gray-300 text-gray-500 text-sm rounded-lg text-center">
                      No disponible
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
