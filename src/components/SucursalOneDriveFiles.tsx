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
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Cargando archivos de OneDrive...</span>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar archivos de OneDrive</h3>
          <p className="text-red-600 mb-4">{error}</p>
          {error.includes('Not authenticated') && (
            <a
              href="/api/auth/login"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
            <h3 className="text-lg font-medium text-gray-900">Archivos de sucursal</h3>
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
          {empresaNombre && (
            <p className="text-sm text-gray-500">
              {empresaNombre} - {sucursalId}
            </p>
          )}
          {folderPath && (
            <p className="text-xs text-gray-400 mt-1">
              Ruta: {folderPath}
            </p>
          )}
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
            {files.length} elemento{files.length !== 1 ? 's' : ''}
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

      {files.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No hay archivos disponibles</h4>
          <p className="text-gray-500">
            No se encontraron archivos en la carpeta de OneDrive para esta sucursal
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                file.type === 'folder' 
                  ? 'bg-gray-100 hover:bg-gray-200 cursor-pointer border border-gray-300' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={file.type === 'folder' ? () => navigateToFolder(file.id, file.name) : undefined}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <span className="text-2xl flex-shrink-0">
                  {getFileIcon(file)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
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
              
              <div className="flex items-center space-x-2 flex-shrink-0">
                {file.type === 'folder' ? (
                  <span className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md">
                    Abrir carpeta
                  </span>
                ) : file.url ? (
                  <>
                    
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Descargar
                    </a>
                  </>
                ) : (
                  <span className="px-3 py-1 bg-gray-300 text-gray-500 text-sm rounded-md cursor-not-allowed">
                    No disponible
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
