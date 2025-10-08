'use client';

import { useState } from 'react';

export default function OneDriveDiagnosticsPage() {
  const [testResult, setTestResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/onedrive/test-auth');
      const data = await response.json();
      setTestResult({ ...data, status: response.status });
    } catch (error: unknown) {
      setTestResult({ error: error instanceof Error ? error.message : 'Unknown error', status: 500 });
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (status: string) => {
    return status.includes('✅') ? (
      <span className="text-green-600">{status}</span>
    ) : (
      <span className="text-red-600">{status}</span>
    );
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Diagnóstico de OneDrive
          </h1>
          <p className="text-gray-600">
            Prueba y verifica la configuración de Microsoft Graph
          </p>
        </div>

        {/* Botón de prueba */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? '🔄 Ejecutando diagnóstico...' : '🚀 Ejecutar Diagnóstico'}
          </button>
        </div>

        {/* Resultados */}
        {testResult && (
          <div className="space-y-6">
            {/* Estado general */}
            <div className={`rounded-2xl p-6 border-2 ${
              testResult.success 
                ? 'bg-green-50 border-green-300' 
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="text-3xl">
                  {testResult.success ? '✅' : '❌'}
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {testResult.success ? '¡Configuración Correcta!' : 'Error en la Configuración'}
                  </h2>
                  <p className="text-sm text-gray-700">
                    {testResult.message || testResult.error}
                  </p>
                </div>
              </div>
            </div>

            {/* Estado de variables de entorno */}
            {testResult.configStatus && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">📋 Variables de Entorno</h3>
                <div className="space-y-2">
                  {Object.entries(testResult.configStatus).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-mono text-sm">{key}</span>
                      {renderStatus(value as string)}
                    </div>
                  ))}
                </div>

                {testResult.preview && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">Vista previa (parcial):</p>
                    <div className="space-y-1 text-xs font-mono">
                      {Object.entries(testResult.preview).map(([key, value]) => (
                        <div key={key} className="text-blue-800">
                          <span className="opacity-60">{key}:</span> {value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Información del token (si exitoso) */}
            {testResult.tokenInfo && (
              <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                <h3 className="text-lg font-semibold text-green-900 mb-4">🔑 Token de Acceso</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Tipo:</strong> {testResult.tokenInfo.tokenType}</p>
                  <p><strong>Expira en:</strong> {testResult.tokenInfo.expiresIn} segundos</p>
                  <p><strong>Scope:</strong> {testResult.tokenInfo.scope}</p>
                </div>
              </div>
            )}

            {/* Detalles del error */}
            {testResult.errorDetails && (
              <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                <h3 className="text-lg font-semibold text-red-900 mb-4">⚠️ Detalles del Error</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Status:</strong> {testResult.errorDetails.status}</p>
                  <p><strong>Código:</strong> {testResult.errorDetails.errorCode}</p>
                  <p className="text-red-700">{testResult.errorDetails.errorDescription}</p>
                </div>
              </div>
            )}

            {/* Causas posibles */}
            {testResult.possibleCauses && (
              <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200">
                <h3 className="text-lg font-semibold text-yellow-900 mb-4">🤔 Posibles Causas</h3>
                <ul className="space-y-2">
                  {testResult.possibleCauses.map((cause: string, i: number) => (
                    <li key={i} className="text-sm text-yellow-800">{cause}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cómo solucionarlo */}
            {testResult.howToFix && (
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">🔧 Cómo Solucionarlo</h3>
                <ol className="space-y-2 list-decimal list-inside">
                  {testResult.howToFix.map((step: string, i: number) => (
                    <li key={i} className="text-sm text-blue-800">{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Próximos pasos (si exitoso) */}
            {testResult.nextSteps && (
              <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                <h3 className="text-lg font-semibold text-green-900 mb-4">🎯 Próximos Pasos</h3>
                <ul className="space-y-2">
                  {testResult.nextSteps.map((step: string, i: number) => (
                    <li key={i} className="text-sm text-green-800">{step}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instrucciones (si hay problemas de config) */}
            {testResult.instructions && (
              <div className="bg-orange-50 rounded-2xl p-6 border border-orange-200">
                <h3 className="text-lg font-semibold text-orange-900 mb-4">📝 Instrucciones</h3>
                <ol className="space-y-2 list-decimal list-inside">
                  {testResult.instructions.map((instruction: string, i: number) => (
                    <li key={i} className="text-sm text-orange-800">{instruction}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* JSON completo (para debugging) */}
            <details className="bg-gray-100 rounded-lg p-4">
              <summary className="cursor-pointer font-medium text-gray-700">
                🔍 Ver JSON Completo (Debug)
              </summary>
              <pre className="mt-4 p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Guía rápida */}
        <div className="mt-8 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">📚 Guía Rápida de Configuración</h3>
          
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">1. Portal de Azure</h4>
              <a 
                href="https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                → Abrir Azure AD App Registrations
              </a>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">2. Variables necesarias en .env.local</h4>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
{`AZURE_TENANT_ID=tu-tenant-id
AZURE_CLIENT_ID=tu-client-id  
AZURE_CLIENT_SECRET=tu-client-secret
ONEDRIVE_USER_EMAIL=tu-email@dominio.com`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">3. Permisos requeridos</h4>
              <ul className="list-disc list-inside text-gray-700">
                <li>Microsoft Graph → Application permissions</li>
                <li>Files.Read.All</li>
                <li>Sites.Read.All (opcional)</li>
                <li>⚠️ ¡No olvides &quot;Grant admin consent&quot;!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
