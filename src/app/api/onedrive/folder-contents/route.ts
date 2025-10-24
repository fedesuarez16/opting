import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebaseAdmin';
import { OneDriveAuth, getOneDriveFilesWithToken } from '@/lib/onedrive-auth';

interface OneDriveItem {
  id: string;
  name: string;
  folder?: {
    childCount: number;
  };
  '@microsoft.graph.downloadUrl'?: string;
  size?: number;
  lastModifiedDateTime?: string;
  createdDateTime?: string;
  webUrl?: string;
}

async function getValidAccessToken(): Promise<string> {
  // Obtener tokens guardados
  const tokenDoc = await adminFirestore
    .collection('config')
    .doc('onedrive_tokens')
    .get();

  if (!tokenDoc.exists) {
    throw new Error('No tokens found. Please login first at /api/auth/login');
  }

  const data = tokenDoc.data()!;
  const expiresAt = new Date(data.expires_at);
  const now = new Date();

  // Si el token aún es válido (con 5 minutos de margen)
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return data.access_token;
  }

  // Si el token expiró, renovarlo
  console.log('🔄 Token expirado, renovando...');
  
  const auth = new OneDriveAuth();
  const newTokens = await auth.refreshAccessToken(data.refresh_token);

  // Actualizar tokens en Firestore
  await adminFirestore
    .collection('config')
    .doc('onedrive_tokens')
    .update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || data.refresh_token,
      expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });

  console.log('✅ Token renovado exitosamente');

  return newTokens.access_token;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const folderId = searchParams.get('folderId');
    const empresaId = searchParams.get('empresaId');
    const sucursalId = searchParams.get('sucursalId');

    if (!folderId) {
      return NextResponse.json(
        { error: 'folderId is required' },
        { status: 400 }
      );
    }

    // 1. Obtener token válido
    const accessToken = await getValidAccessToken();

    // 2. Obtener contenido de la carpeta
    const files = await getOneDriveFilesWithToken(accessToken, folderId);

    // 3. Formatear respuesta
    const formattedFiles = files.map((file: OneDriveItem) => ({
      id: file.id,
      name: file.name,
      type: file.folder ? 'folder' : 'file',
      url: file['@microsoft.graph.downloadUrl'] || file.webUrl || null,
      size: file.size,
      lastModified: file.lastModifiedDateTime,
      created: file.createdDateTime,
      webUrl: file.webUrl,
      childCount: file.folder?.childCount || 0
    }));

    return NextResponse.json({
      success: true,
      folderId,
      empresaId,
      sucursalId,
      files: formattedFiles,
      totalFiles: formattedFiles.length
    });

  } catch (error: any) {
    console.error('Error getting folder contents:', error);
    
    if (error.message.includes('No tokens found')) {
      return NextResponse.json(
        { 
          error: 'Not authenticated',
          message: 'Please login first',
          loginUrl: '/api/auth/login'
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
