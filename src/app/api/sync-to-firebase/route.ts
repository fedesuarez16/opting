import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    // Parse the incoming data
    const data = await req.json();
    
    // Validate required fields
    if (!data.CLIENTE || !data.SUCURSAL || !data['FECHAS DE MEDICIÓN']) {
      return NextResponse.json(
        { error: 'Missing required fields: CLIENTE, SUCURSAL, or FECHAS DE MEDICIÓN' },
        { status: 400 }
      );
    }

    // Format the date for document ID (replace / with -)
    const formattedDate = data['FECHAS DE MEDICIÓN'].replace(/\//g, '-');
    
    // Create the document reference with the path structure
    // /empresas/{CLIENTE}/sucursales/{SUCURSAL}/mediciones/{fecha-formateada}
    const docRef = adminFirestore
      .collection('empresas')
      .doc(data.CLIENTE)
      .collection('sucursales')
      .doc(data.SUCURSAL)
      .collection('mediciones')
      .doc(formattedDate);
    
    // Save the data to Firestore
    await docRef.set({
      ...data,
      fechaCreacion: new Date().toISOString()
    });
    
    return NextResponse.json({ success: true, message: 'Data synced to Firebase successfully' });
  } catch (error) {
    console.error('Error syncing data to Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to sync data to Firebase' },
      { status: 500 }
    );
  }
} 