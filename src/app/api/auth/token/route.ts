import { NextRequest, NextResponse } from 'next/server';
import { OneDriveAuth } from '@/lib/onedrive-auth';
import { adminFirestore } from '@/lib/firebaseAdmin';

// Obtener un access token válido (renovando si es necesario)
export async function GET(req: NextRequest) {
  try {
    // Obtener tokens guardados
    const tokenDoc = await adminFirestore
      .collection('config')
      .doc('onedrive_tokens')
      .get();

    if (!tokenDoc.exists) {
      return NextResponse.json(
        { 
          error: 'No tokens found', 
          message: 'El administrador debe iniciar sesión primero',
          loginUrl: '/api/auth/login'
        },
        { status: 401 }
      );
    }

    const data = tokenDoc.data()!;
    const expiresAt = new Date(data.expires_at);
    const now = new Date();

    // Si el token aún es válido (con 5 minutos de margen)
    if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
      return NextResponse.json({
        access_token: data.access_token,
        expires_at: data.expires_at,
      });
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
        refresh_token: newTokens.refresh_token || data.refresh_token, // Algunos refresh tokens no se renuevan
        expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });

    console.log('✅ Token renovado exitosamente');

    return NextResponse.json({
      access_token: newTokens.access_token,
      expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error('Error getting token:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get valid token', 
        details: error.message,
        loginUrl: '/api/auth/login'
      },
      { status: 500 }
    );
  }
}
