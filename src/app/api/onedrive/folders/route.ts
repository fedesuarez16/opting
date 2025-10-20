import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebaseAdmin';
import { OneDriveAuth, getOneDriveFilesWithToken, searchOneDriveFolders } from '@/lib/onedrive-auth';

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
    const action = searchParams.get('action');
    const folderName = searchParams.get('folderName');
    const folderId = searchParams.get('folderId');

    // Obtener token válido
    const accessToken = await getValidAccessToken();

    // Acción 1: Listar todas las carpetas en la raíz
    if (action === 'list-root-folders') {
      const files = await getOneDriveFilesWithToken(accessToken, 'root');
      const folders = files.filter((item: OneDriveItem) => item.folder);
      
      return NextResponse.json({
        success: true,
        folders: folders.map((folder: OneDriveItem) => ({
          id: folder.id,
          name: folder.name,
          childCount: folder.folder?.childCount,
          webUrl: folder.webUrl
        }))
      });
    }

    // Acción 2: Buscar carpeta por nombre
    if (action === 'search-folder' && folderName) {
      const folders = await searchOneDriveFolders(accessToken, folderName);
      
      return NextResponse.json({
        success: true,
        query: folderName,
        folders: folders.map((folder: OneDriveItem) => ({
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
      const url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get folder info');
      }

      const folder: OneDriveItem = await response.json();

      return NextResponse.json({
        success: true,
        folder: {
          id: folder.id,
          name: folder.name,
          path: folder.parentReference?.path,
          childCount: folder.folder?.childCount,
          webUrl: folder.webUrl
        }
      });
    }

    // Acción 4: Listar contenido de una carpeta específica
    if (action === 'list-folder-contents' && folderId) {
      const files = await getOneDriveFilesWithToken(accessToken, folderId);
      
      const items = files.map((item: OneDriveItem) => ({
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
        'list-root-folders': '/api/onedrive/folders?action=list-root-folders',
        'search-folder': '/api/onedrive/folders?action=search-folder&folderName=NombreCarpeta',
        'get-folder-info': '/api/onedrive/folders?action=get-folder-info&folderId=FOLDER_ID',
        'list-folder-contents': '/api/onedrive/folders?action=list-folder-contents&folderId=FOLDER_ID'
      }
    }, { status: 400 });

  } catch (error: any) {
    console.error('Error in OneDrive folders API:', error);
    
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
