import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

// Initialize Firebase Admin
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error('Firebase Admin credentials are not properly configured');
    }

    initializeApp({
      credential: cert(serviceAccount as any),
      databaseURL: process.env.FIREBASE_ADMIN_DATABASE_URL,
    });
  }

  return {
    auth: getAuth(),
    database: getDatabase(),
  };
};

export async function DELETE(req: NextRequest) {
  try {
    const { auth, database } = initializeFirebaseAdmin();
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    
    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'UID is required' },
        { status: 400 }
      );
    }
    
    // Eliminar de Authentication
    await auth.deleteUser(uid);
    
    // Eliminar de Realtime Database
    const dbRef = database.ref(`users/${uid}`);
    await dbRef.set(null);
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete user',
      },
      { status: 500 }
    );
  }
}
