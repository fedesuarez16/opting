import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface MicrosoftGraphToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface OneDriveItem {
  id: string;
  name: string;
  folder?: {
    childCount: number;
  };
  parentReference?: {
    path: string;
  };
  webUrl?: string;
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
  } catch (error: unknown) {
    console.error('❌ Error getting access token');
    console.error('📋 Error details from Microsoft:', (error as any).response?.data);
    console.error('🔍 Status code:', (error as any).response?.status);
    console.error('🔑 Using Tenant ID:', process.env.AZURE_TENANT_ID?.substring(0, 8) + '...');
    console.error('🔑 Using Client ID:', process.env.AZURE_CLIENT_ID?.substring(0, 8) + '...');
    
    // Devolver el error específico de Microsoft si está disponible
    const msError = (error as any).response?.data;
    if (msError) {
      throw new Error(`Microsoft Auth Error: ${msError.error} - ${msError.error_description || 'No description'}`);
    }
    
    throw new Error('Failed to obtain access token from Microsoft Graph');
  }
}

// Listar todas las carpetas en la raíz de OneDrive
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get('action');
    const folderName = searchParams.get('folderName');
    const folderId = searchParams.get('folderId');
    const userId = searchParams.get('userId'); // Email del usuario de OneDrive

    if (!process.env.AZURE_TENANT_ID || !process.env.AZURE_CLIENT_ID || !process.env.AZURE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Azure configuration is missing' },
        { status: 500 }
      );
    }

    // Para client_credentials, necesitamos especificar el usuario
    // Puede ser el email del usuario o usar una variable de entorno
    const oneDriveUser = userId || process.env.ONEDRIVE_USER_EMAIL;
    
    if (!oneDriveUser) {
      return NextResponse.json(
        { 
          error: 'OneDrive user email is required',
          message: 'Add ONEDRIVE_USER_EMAIL to .env.local or pass userId parameter'
        },
        { status: 400 }
      );
    }

    const accessToken = await getAccessToken();

    // Acción 1: Listar todas las carpetas en la raíz
    if (action === 'list-root-folders') {
      const response = await axios.get<{ value: OneDriveItem[] }>(
        `https://graph.microsoft.com/v1.0/users/${oneDriveUser}/drive/root/children`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const folders = response.data.value.filter(item => item.folder);
      
      return NextResponse.json({
        success: true,
        folders: folders.map(folder => ({
          id: folder.id,
          name: folder.name,
          childCount: folder.folder?.childCount,
          webUrl: folder.webUrl
        }))
      });
    }

    // Acción 2: Buscar carpeta por nombre
    if (action === 'search-folder' && folderName) {
      const response = await axios.get<{ value: OneDriveItem[] }>(
        `https://graph.microsoft.com/v1.0/users/${oneDriveUser}/drive/root/search(q='${encodeURIComponent(folderName)}')`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const folders = response.data.value.filter(item => item.folder);
      
      return NextResponse.json({
        success: true,
        query: folderName,
        folders: folders.map(folder => ({
          id: folder.id,
          name: folder.name,
          path: folder.parentReference?.path,
          childCount: folder.folder?.childCount,
          webUrl: folder.webUrl
        }))
      });
    }

    // Acción 3: Obtener información de una carpeta específica por ID
    if (action === 'get-folder-info' && folderId) {
      const response = await axios.get<OneDriveItem>(
        `https://graph.microsoft.com/v1.0/users/${oneDriveUser}/drive/items/${folderId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return NextResponse.json({
        success: true,
        folder: {
          id: response.data.id,
          name: response.data.name,
          path: response.data.parentReference?.path,
          childCount: response.data.folder?.childCount,
          webUrl: response.data.webUrl
        }
      });
    }

    // Acción 4: Listar contenido de una carpeta específica
    if (action === 'list-folder-contents' && folderId) {
      const response = await axios.get<{ value: OneDriveItem[] }>(
        `https://graph.microsoft.com/v1.0/users/${oneDriveUser}/drive/items/${folderId}/children`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const items = response.data.value.map(item => ({
        id: item.id,
        name: item.name,
        type: item.folder ? 'folder' : 'file',
        childCount: item.folder?.childCount,
        webUrl: item.webUrl
      }));

      return NextResponse.json({
        success: true,
        folderId,
        items
      });
    }

    // Si no se especifica una acción válida
    return NextResponse.json({
      error: 'Invalid action. Use: list-root-folders, search-folder, get-folder-info, or list-folder-contents',
      usage: {
        'list-root-folders': '/api/onedrive/helpers?action=list-root-folders',
        'search-folder': '/api/onedrive/helpers?action=search-folder&folderName=NombreCarpeta',
        'get-folder-info': '/api/onedrive/helpers?action=get-folder-info&folderId=FOLDER_ID',
        'list-folder-contents': '/api/onedrive/helpers?action=list-folder-contents&folderId=FOLDER_ID'
      }
    }, { status: 400 });

  } catch (error: unknown) {
    console.error('Error in OneDrive helpers API:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error as any).response?.data : undefined
      },
      { status: 500 }
    );
  }
}
