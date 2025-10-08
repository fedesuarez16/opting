'use client';

import { useState, useEffect } from 'react';

interface Folder {
  id: string;
  name: string;
  childCount?: number;
  webUrl?: string;
  path?: string;
}

export default function OneDriveSetupPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'search'>('list');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar si hay parámetros de éxito o error en la URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setAuthSuccess(true);
      // Limpiar URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('error')) {
      setAuthError(params.get('error_description') || params.get('message') || 'Error en la autenticación');
    }
  }, []);

  const listRootFolders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/onedrive/helpers?action=list-root-folders');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch folders');
      }
      
      setFolders(data.folders);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const searchFolders = async () => {
    if (!searchQuery.trim()) {
      setError('Por favor ingresa un nombre de carpeta');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/onedrive/helpers?action=search-folder&folderName=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to search folders');
      }
      
      setFolders(data.folders);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Configuración de OneDrive
          </h1>
          <p className="text-gray-600">
            Encuentra los IDs de carpetas de OneDrive para asignar a tus clientes
          </p>
        </div>

        {/* Mensaje de éxito */}
        {authSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <svg className="h-6 w-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-green-900">¡Autenticación Exitosa!</h3>
                <p className="text-green-700">Ya puedes listar las carpetas de tu OneDrive personal</p>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de error */}
        {authError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <svg className="h-6 w-6 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-red-900">Error en la Autenticación</h3>
                <p className="text-red-700">{authError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Botón de Login */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 mb-6 text-white">
          <h2 className="text-xl font-semibold mb-3">🔐 Paso 1: Autenticación</h2>
          <p className="mb-4">Primero, debes autorizar la aplicación para acceder a tu OneDrive personal</p>
          <a
            href="/api/auth/login"
            className="inline-block px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-lg"
          >
            🚀 Iniciar Sesión con Microsoft
          </a>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            ¿Cómo funciona?
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Haz clic en &quot;Iniciar Sesión con Microsoft&quot; arriba</li>
            <li>Autoriza la aplicación en la pantalla de Microsoft</li>
            <li>Regresarás aquí automáticamente</li>
            <li>Busca o lista las carpetas de tu OneDrive</li>
            <li>Encuentra la carpeta que corresponde a cada cliente</li>
            <li>Copia el ID de la carpeta (se copiará al portapapeles)</li>
            <li>Guarda ese ID en el campo <code className="bg-blue-100 px-1 py-0.5 rounded">oneDriveFolderId</code> del cliente en Firestore</li>
          </ol>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'list'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Listar Carpetas Raíz
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'search'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Buscar Carpeta
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'list' && (
              <div>
                <p className="text-gray-600 mb-4">
                  Lista todas las carpetas en la raíz de tu OneDrive
                </p>
                <button
                  onClick={listRootFolders}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Cargando...' : 'Listar Carpetas'}
                </button>
              </div>
            )}

            {activeTab === 'search' && (
              <div>
                <p className="text-gray-600 mb-4">
                  Busca una carpeta específica por su nombre
                </p>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchFolders()}
                    placeholder="Nombre de la carpeta..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={searchFolders}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {folders.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Carpetas Encontradas ({folders.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {folders.map((folder) => (
                <div key={folder.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        <h4 className="text-lg font-medium text-gray-900">{folder.name}</h4>
                      </div>
                      
                      {folder.path && (
                        <p className="text-sm text-gray-500 mb-2">
                          <span className="font-medium">Ruta:</span> {folder.path}
                        </p>
                      )}
                      
                      {folder.childCount !== undefined && (
                        <p className="text-sm text-gray-500 mb-2">
                          <span className="font-medium">Archivos:</span> {folder.childCount}
                        </p>
                      )}
                      
                      <div className="bg-gray-100 rounded p-3 font-mono text-sm text-gray-700 break-all">
                        <span className="font-medium text-gray-500">ID:</span> {folder.id}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => copyToClipboard(folder.id)}
                      className="ml-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
                    >
                      {copiedId === folder.id ? (
                        <>
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copiar ID</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {folder.webUrl && (
                    <a
                      href={folder.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Abrir en OneDrive
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Métodos Alternativos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Métodos Alternativos para Obtener el Folder ID
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">1. Desde la URL de OneDrive (Web)</h4>
              <p className="text-gray-600 text-sm mb-2">
                Navega a la carpeta en OneDrive web. La URL contendrá el ID:
              </p>
              <code className="block bg-gray-100 p-2 rounded text-sm">
                https://onedrive.live.com/?id=<span className="text-blue-600 font-bold">01ABCDEFGHIJKLMNOPQRSTUVWXYZ</span>
              </code>
            </div>

            <div>
              <h4 className="font-medium text-gray-800 mb-2">2. Microsoft Graph Explorer</h4>
              <p className="text-gray-600 text-sm mb-2">
                Usa Graph Explorer para explorar tu OneDrive:
              </p>
              <a
                href="https://developer.microsoft.com/graph/graph-explorer"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Abrir Graph Explorer
              </a>
              <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                GET https://graph.microsoft.com/v1.0/me/drive/root/children
              </pre>
            </div>

            <div>
              <h4 className="font-medium text-gray-800 mb-2">3. Compartir Link</h4>
              <p className="text-gray-600 text-sm">
                Haz clic derecho en la carpeta → &quot;Compartir&quot; → Copia el link. El ID estará en la URL compartida.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
