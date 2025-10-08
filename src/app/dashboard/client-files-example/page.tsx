'use client';

import { useState } from 'react';
import ClientFiles from '@/components/ClientFiles';

export default function ClientFilesExamplePage() {
  const [clientId, setClientId] = useState('');
  const [showFiles, setShowFiles] = useState(false);

  const handleShowFiles = () => {
    if (clientId.trim()) {
      setShowFiles(true);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Archivos de OneDrive - Ejemplo
          </h1>
          <p className="text-gray-600">
            Ingresa el ID de un cliente para ver sus archivos de OneDrive
          </p>
        </div>

        {/* Formulario para ingresar Client ID */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
                Client ID
              </label>
              <input
                type="text"
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Ingresa el ID del cliente (ej: EMPRESA_EJEMPLO)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleShowFiles}
              disabled={!clientId.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Mostrar Archivos
            </button>
          </div>
        </div>

        {/* Ejemplo de uso del componente */}
        {showFiles && (
          <div>
            <ClientFiles clientId={clientId} />
          </div>
        )}

        {/* Documentación de uso */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Cómo usar el componente ClientFiles
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Importación:</h3>
              <pre className="bg-gray-100 p-3 rounded-md text-sm overflow-x-auto">
                <code>{`import ClientFiles from '@/components/ClientFiles';`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Uso básico:</h3>
              <pre className="bg-gray-100 p-3 rounded-md text-sm overflow-x-auto">
                <code>{`<ClientFiles clientId="123" />`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Requisitos previos:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>El cliente debe existir en la colección 'empresas' de Firestore</li>
                <li>El cliente debe tener el campo 'oneDriveFolderId' configurado</li>
                <li>Las variables de entorno de Azure deben estar configuradas:
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>AZURE_TENANT_ID</li>
                    <li>AZURE_CLIENT_ID</li>
                    <li>AZURE_CLIENT_SECRET</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Funcionalidades:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Carga automática de archivos al proporcionar un clientId</li>
                <li>Manejo de estados de carga y error</li>
                <li>Enlaces de descarga directa para cada archivo</li>
                <li>Información de metadatos (tamaño, fecha de modificación)</li>
                <li>Iconos intuitivos según el tipo de archivo</li>
                <li>Interfaz responsive y moderna</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
