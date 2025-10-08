import { NextRequest, NextResponse } from 'next/server';
import { OneDriveAuth } from '@/lib/onedrive-auth';

export async function GET(_req: NextRequest) {
  try {
    const auth = new OneDriveAuth();
    const authUrl = auth.getAuthorizationUrl();

    // Redirigir al usuario a Microsoft para que inicie sesión
    return NextResponse.redirect(authUrl);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to initiate login', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
