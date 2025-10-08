import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface MicrosoftGraphToken {
  access_token: string;
}

async function getAccessToken(): Promise<string> {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID!,
      client_secret: process.env.AZURE_CLIENT_SECRET!,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const response = await axios.post<MicrosoftGraphToken>(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  } catch (error: any) {
    throw new Error('Failed to obtain access token');
  }
}

export async function GET(req: NextRequest) {
  try {
    const accessToken = await getAccessToken();

    // Verificar si hay sitios de SharePoint disponibles
    const sitesResponse = await axios.get(
      'https://graph.microsoft.com/v1.0/sites?search=*',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const sites = sitesResponse.data.value.map((site: any) => ({
      name: site.displayName,
      webUrl: site.webUrl,
      id: site.id,
      description: site.description
    }));

    if (sites.length > 0) {
      return NextResponse.json({
        success: true,
        message: '✅ ¡Tienes SharePoint disponible!',
        sites,
        recommendation: [
          'Puedes usar SharePoint en lugar de OneDrive',
          'SharePoint es ideal para almacenar archivos de clientes',
          'No necesitas licencias de Microsoft 365 para cada usuario',
          'Solo necesitas crear carpetas en SharePoint para cada cliente'
        ],
        nextSteps: [
          '1. Elige uno de los sitios de SharePoint arriba',
          '2. Crea una biblioteca de documentos para tus clientes',
          '3. Usa el ID del sitio para acceder a los archivos',
          '4. Puedo ayudarte a adaptar el código para usar SharePoint'
        ]
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'No se encontraron sitios de SharePoint',
        recommendation: [
          'Opción 1: Activar trial gratuito de Microsoft 365',
          'Opción 2: Comprar licencia de Microsoft 365 Business Basic (~$6/mes)',
          'Opción 3: Usar otro servicio de almacenamiento (Google Drive, Dropbox, AWS S3)'
        ]
      });
    }

  } catch (error: any) {
    console.error('Error checking SharePoint:', error.response?.data);
    
    return NextResponse.json({
      error: 'Failed to check SharePoint',
      details: error.response?.data || error.message,
      possibleReasons: [
        'La aplicación necesita permisos de Sites.Read.All',
        'No se ha dado "Grant admin consent"',
        'No hay SharePoint configurado en este tenant'
      ]
    }, { status: 500 });
  }
}
