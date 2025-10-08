import { NextRequest, NextResponse } from 'next/server';
import { OneDriveAuth } from '@/lib/onedrive-auth';
import { adminFirestore } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Si hubo un error en la autorización
    if (error) {
      return NextResponse.redirect(
        `${req.nextUrl.origin}/dashboard/onedrive-setup?error=${error}&description=${errorDescription}`
      );
    }

    // Si no hay código, error
    if (!code) {
      return NextResponse.redirect(
        `${req.nextUrl.origin}/dashboard/onedrive-setup?error=no_code`
      );
    }

    // Intercambiar código por tokens
    const auth = new OneDriveAuth();
    const tokens = await auth.getTokenFromCode(code);

    // Guardar los tokens en Firestore
    await adminFirestore
      .collection('config')
      .doc('onedrive_tokens')
      .set({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        token_type: tokens.token_type,
      });

    console.log('✅ OneDrive tokens guardados exitosamente');

    // Redirigir al usuario de vuelta a la app
    return NextResponse.redirect(
      `${req.nextUrl.origin}/dashboard/onedrive-setup?success=true`
    );
  } catch (error: any) {
    console.error('Error in auth callback:', error);
    return NextResponse.redirect(
      `${req.nextUrl.origin}/dashboard/onedrive-setup?error=token_exchange&message=${encodeURIComponent(error.message)}`
    );
  }
}
