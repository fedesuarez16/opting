import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: NextRequest) {
  try {
    // Verificar que las variables de entorno existan
    const config = {
      tenantId: process.env.AZURE_TENANT_ID,
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      oneDriveUser: process.env.ONEDRIVE_USER_EMAIL
    };

    // Mostrar qué variables están configuradas (sin revelar valores sensibles)
    const configStatus = {
      AZURE_TENANT_ID: config.tenantId ? '✅ Configurado' : '❌ Falta',
      AZURE_CLIENT_ID: config.clientId ? '✅ Configurado' : '❌ Falta',
      AZURE_CLIENT_SECRET: config.clientSecret ? '✅ Configurado' : '❌ Falta',
      ONEDRIVE_USER_EMAIL: config.oneDriveUser ? '✅ Configurado' : '❌ Falta'
    };

    // Mostrar primeros/últimos caracteres para verificar (sin revelar todo)
    const preview = {
      AZURE_TENANT_ID: config.tenantId ? 
        `${config.tenantId.substring(0, 8)}...${config.tenantId.substring(config.tenantId.length - 4)}` : 
        'No configurado',
      AZURE_CLIENT_ID: config.clientId ? 
        `${config.clientId.substring(0, 8)}...${config.clientId.substring(config.clientId.length - 4)}` : 
        'No configurado',
      AZURE_CLIENT_SECRET: config.clientSecret ? 
        `${config.clientSecret.substring(0, 4)}...` : 
        'No configurado',
      ONEDRIVE_USER_EMAIL: config.oneDriveUser || 'No configurado'
    };

    // Verificar si todas están configuradas
    if (!config.tenantId || !config.clientId || !config.clientSecret) {
      return NextResponse.json({
        error: 'Configuración incompleta',
        status: configStatus,
        preview,
        instructions: [
          '1. Verifica que .env.local existe en la raíz del proyecto',
          '2. Asegúrate de que las variables estén sin comillas extras',
          '3. Reinicia el servidor después de editar .env.local',
          '4. Las variables deben ser: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, ONEDRIVE_USER_EMAIL'
        ]
      }, { status: 400 });
    }

    // Intentar obtener el token
    const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    let tokenResponse;
    try {
      tokenResponse = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return NextResponse.json({
        success: true,
        message: '🎉 ¡Autenticación exitosa!',
        configStatus,
        preview,
        tokenInfo: {
          tokenType: tokenResponse.data.token_type,
          expiresIn: tokenResponse.data.expires_in,
          scope: tokenResponse.data.scope
        },
        nextSteps: [
          '✅ Las credenciales de Azure están configuradas correctamente',
          '✅ Ahora puedes usar los endpoints de OneDrive',
          '→ Prueba: /dashboard/onedrive-setup'
        ]
      });

    } catch (authError: any) {
      // Error al obtener token
      const errorDetails = authError.response?.data;
      
      return NextResponse.json({
        error: 'Error de autenticación con Microsoft Graph',
        configStatus,
        preview,
        errorDetails: {
          status: authError.response?.status,
          errorCode: errorDetails?.error,
          errorDescription: errorDetails?.error_description,
          timestamp: errorDetails?.timestamp
        },
        possibleCauses: [
          '❌ AZURE_TENANT_ID incorrecto',
          '❌ AZURE_CLIENT_ID incorrecto',
          '❌ AZURE_CLIENT_SECRET incorrecto o expirado',
          '❌ La aplicación no tiene permisos configurados en Azure AD',
          '❌ No se dio "Grant admin consent" a los permisos'
        ],
        howToFix: [
          '1. Ve al Portal de Azure: https://portal.azure.com',
          '2. Azure Active Directory → App registrations → Tu aplicación',
          '3. Verifica el Tenant ID (Directory ID) y Client ID (Application ID)',
          '4. Genera un nuevo Client Secret en "Certificates & secrets"',
          '5. Configura los permisos en "API permissions":',
          '   - Microsoft Graph → Application permissions',
          '   - Files.Read.All',
          '   - Sites.Read.All',
          '6. HAZ CLIC en "Grant admin consent"',
          '7. Actualiza las variables en .env.local',
          '8. Reinicia el servidor'
        ]
      }, { status: 401 });
    }

  } catch (error: any) {
    return NextResponse.json({
      error: 'Error inesperado',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
