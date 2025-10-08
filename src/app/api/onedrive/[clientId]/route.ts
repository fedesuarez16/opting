import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebaseAdmin';
import axios from 'axios';

interface MicrosoftGraphToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface OneDriveFile {
  id: string;
  name: string;
  '@microsoft.graph.downloadUrl'?: string;
  size?: number;
  lastModifiedDateTime?: string;
  createdDateTime?: string;
  webUrl?: string;
}

interface OneDriveResponse {
  value: OneDriveFile[];
}

interface Client {
  id: string;
  nombre?: string;
  oneDriveFolderId?: string;
  [key: string]: unknown;
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

async function getClientById(clientId: string): Promise<Client | null> {
  try {
    const clientDoc = await adminFirestore
      .collection('empresas')
      .doc(clientId)
      .get();

    if (!clientDoc.exists) {
      return null;
    }

    return {
      id: clientDoc.id,
      ...clientDoc.data()
    } as Client;
  } catch (error) {
    console.error('Error getting client from database:', error);
    throw new Error('Failed to retrieve client from database');
  }
}

async function getOneDriveFiles(accessToken: string, folderId: string): Promise<OneDriveFile[]> {
  try {
    // Para client_credentials, necesitamos especificar el usuario
    const oneDriveUser = process.env.ONEDRIVE_USER_EMAIL;
    
    if (!oneDriveUser) {
      throw new Error('ONEDRIVE_USER_EMAIL environment variable is required');
    }

    const graphUrl = `https://graph.microsoft.com/v1.0/users/${oneDriveUser}/drive/items/${folderId}/children`;
    
    const response = await axios.get<OneDriveResponse>(graphUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.value;
  } catch (error: unknown) {
    console.error('Error fetching OneDrive files:', error);
    
    if ((error as any).response?.status === 404) {
      throw new Error('OneDrive folder not found');
    } else if ((error as any).response?.status === 403) {
      throw new Error('Access denied to OneDrive folder');
    }
    
    throw new Error('Failed to fetch files from OneDrive');
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Validar variables de entorno
    if (!process.env.AZURE_TENANT_ID || !process.env.AZURE_CLIENT_ID || !process.env.AZURE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Azure configuration is missing' },
        { status: 500 }
      );
    }

    // 1. Buscar el cliente en la base de datos
    const client = await getClientById(clientId);
    
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // 2. Verificar que el cliente tiene una carpeta de OneDrive asignada
    if (!client.oneDriveFolderId) {
      return NextResponse.json(
        { error: 'Client does not have an assigned OneDrive folder' },
        { status: 404 }
      );
    }

    // 3. Obtener token de acceso de Microsoft Graph
    const accessToken = await getAccessToken();

    // 4. Obtener archivos de OneDrive
    const oneDriveFiles = await getOneDriveFiles(accessToken, client.oneDriveFolderId);

    // 5. Formatear respuesta con los campos solicitados
    const formattedFiles = oneDriveFiles.map(file => ({
      id: file.id,
      name: file.name,
      url: file['@microsoft.graph.downloadUrl'] || file.webUrl || null,
      size: file.size,
      lastModified: file.lastModifiedDateTime,
      created: file.createdDateTime
    }));

    return NextResponse.json({
      success: true,
      clientId,
      clientName: client.nombre || clientId,
      files: formattedFiles,
      totalFiles: formattedFiles.length
    });

  } catch (error: unknown) {
    console.error('Error in OneDrive API:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}
