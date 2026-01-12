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

export async function GET(req: NextRequest) {
  try {
    const { auth, database } = initializeFirebaseAdmin();
    
    // Obtener todos los usuarios de Authentication
    const listUsersResult = await auth.listUsers();
    const authUsers = listUsersResult.users;
    
    // Obtener datos adicionales de Realtime Database
    const dbRef = database.ref('users');
    const dbSnapshot = await dbRef.get();
    const dbUsers = dbSnapshot.val() || {};
    
    // Combinar datos de Authentication con datos de Realtime Database
    const users = authUsers.map((authUser) => {
      const dbUserData = dbUsers[authUser.uid] || {};
      return {
        uid: authUser.uid,
        email: authUser.email || 'Sin email',
        emailVerified: authUser.emailVerified,
        disabled: authUser.disabled,
        metadata: {
          creationTime: authUser.metadata.creationTime,
          lastSignInTime: authUser.metadata.lastSignInTime,
        },
        // Datos adicionales de Realtime Database
        role: dbUserData.role || 'admin',
        empresaId: dbUserData.empresaId,
        sucursalId: dbUserData.sucursalId,
        empresaNombre: dbUserData.empresaNombre,
        sucursalNombre: dbUserData.sucursalNombre,
        createdAt: dbUserData.createdAt,
      };
    });
    
    return NextResponse.json({
      success: true,
      users,
      total: users.length,
    });
  } catch (error: any) {
    console.error('Error listing users:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to list users',
      },
      { status: 500 }
    );
  }
}
