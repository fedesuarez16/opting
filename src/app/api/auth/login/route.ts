import { NextRequest, NextResponse } from 'next/server';
import { OneDriveAuth } from '@/lib/onedrive-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = new OneDriveAuth();
    const authUrl = auth.getAuthorizationUrl();

    // Redirigir al usuario a Microsoft para que inicie sesión
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to initiate login', details: error.message },
      { status: 500 }
    );
  }
}
