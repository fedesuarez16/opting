import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebaseAdmin';
import { OneDriveAuth, searchOneDriveFolders, getOneDriveFilesWithToken } from '@/lib/onedrive-auth';

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
    const empresaId = searchParams.get('empresaId');
    const sucursalId = searchParams.get('sucursalId');

    if (!empresaId || !sucursalId) {
      return NextResponse.json(
        { error: 'empresaId and sucursalId are required' },
        { status: 400 }
      );
    }

    // 1. Obtener información de la empresa desde Firestore
    const empresaDoc = await adminFirestore
      .collection('empresas')
      .doc(empresaId)
      .get();

    if (!empresaDoc.exists) {
      return NextResponse.json(
        { error: 'Empresa not found' },
        { status: 404 }
      );
    }

    const empresaData = empresaDoc.data();
    const empresaNombre = empresaData?.nombre || empresaId;

    console.log('🏢 Empresa encontrada:', empresaNombre);

    // 2. Obtener token válido
    const accessToken = await getValidAccessToken();

    // 3. Buscar la carpeta de la sucursal en OneDrive
    // Estructura: ARCOS DORADOS/2- Seguridad & Higiene/CABA/AB3
    const folderPath = `${empresaNombre}/2- Seguridad & Higiene/CABA/${sucursalId}`;
    
    console.log('🔍 Buscando carpeta:', folderPath);

    // Buscar por nombre de la sucursal primero
    const folders = await searchOneDriveFolders(accessToken, sucursalId);
    
    // Filtrar para encontrar la carpeta correcta
    let targetFolder = null;
    
    for (const folder of folders) {
      // Verificar si esta carpeta está en la estructura correcta
      // Por ahora, vamos a buscar por nombre exacto de sucursal
      if (folder.name === sucursalId) {
        // Verificar si está dentro de la estructura esperada
        // TODO: Implementar búsqueda recursiva para verificar la ruta completa
        targetFolder = folder;
        break;
      }
    }

    if (!targetFolder) {
      return NextResponse.json({
        success: true,
        empresaId,
        sucursalId,
        empresaNombre,
        folderPath,
        files: [],
        totalFiles: 0,
        message: `No se encontró la carpeta para la sucursal ${sucursalId} en la estructura esperada`
      });
    }

    console.log('📁 Carpeta encontrada:', targetFolder.name, 'ID:', targetFolder.id);

    // 4. Obtener archivos de la carpeta
    const files = await getOneDriveFilesWithToken(accessToken, targetFolder.id);

    // 5. Formatear respuesta
    const formattedFiles = files.map((file: OneDriveItem) => ({
      id: file.id,
      name: file.name,
      url: file['@microsoft.graph.downloadUrl'] || file.webUrl || null,
      size: file.size,
      lastModified: file.lastModifiedDateTime,
      created: file.createdDateTime,
      webUrl: file.webUrl
    }));

    return NextResponse.json({
      success: true,
      empresaId,
      sucursalId,
      empresaNombre,
      folderPath,
      folderId: targetFolder.id,
      files: formattedFiles,
      totalFiles: formattedFiles.length
    });

  } catch (error: any) {
    console.error('Error getting sucursal files:', error);
    
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
