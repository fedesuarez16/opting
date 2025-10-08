'use client';

import { useState } from 'react';
import { collection, getDocs, doc, getDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { firestore, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export default function DebugPage() {
  const [resultado, setResultado] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const verificarEmpresasYSucursales = async () => {
    setLoading(true);
    setResultado('');
    
    try {
      let log = 'VERIFICACIÓN DE EMPRESAS Y SUCURSALES\n\n';
      
      // 1. Obtener todas las empresas
      log += '1. Obteniendo todas las empresas...\n';
      const empresasCollection = collection(firestore, 'empresas');
      const empresasSnapshot = await getDocs(empresasCollection);
      
      log += `Número total de empresas: ${empresasSnapshot.size}\n\n`;
      
      // 2. Para cada empresa, obtener sus sucursales
      for (const empresaDoc of empresasSnapshot.docs) {
        const empresaData = empresaDoc.data();
        log += `EMPRESA: ${empresaDoc.id}\n`;
        log += `  - Nombre: ${empresaData.nombre || empresaData.CLIENTE || 'Sin nombre'}\n`;
        log += `  - Datos: ${JSON.stringify(empresaData, null, 2)}\n`;
        
        // Obtener sucursales
        const sucursalesCollection = collection(empresaDoc.ref, 'sucursales');
        const sucursalesSnapshot = await getDocs(sucursalesCollection);
        
        log += `  - Número de sucursales: ${sucursalesSnapshot.size}\n`;
        
        if (sucursalesSnapshot.size > 0) {
          log += `  - SUCURSALES:\n`;
          sucursalesSnapshot.forEach((sucursalDoc) => {
            const sucursalData = sucursalDoc.data();
            log += `    * ${sucursalDoc.id}: ${sucursalData.nombre || sucursalData.SUCURSAL || 'Sin nombre'}\n`;
            log += `      Datos: ${JSON.stringify(sucursalData, null, 2)}\n`;
          });
        } else {
          log += `  - No hay sucursales\n`;
        }
        log += '\n';
      }
      
      setResultado(log);
    } catch (error) {
      console.error('Error verificando empresas y sucursales:', error);
      setResultado(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const verificarFirestore = async () => {
    setLoading(true);
    setResultado('');
    
    try {
      let log = 'VERIFICACIÓN DE FIRESTORE\n\n';
      
      // 1. Verificar conexión a Firestore
      log += '1. Verificando conexión a Firestore...\n';
      log += `Firestore instance: ${firestore ? 'OK' : 'ERROR'}\n\n`;
      
      // 2. Verificar autenticación
      log += '2. Verificando autenticación...\n';
      log += `Usuario autenticado: ${user ? 'SÍ' : 'NO'}\n`;
      if (user) {
        log += `Usuario UID: ${user.uid}\n`;
        log += `Usuario email: ${user.email}\n`;
      }
      log += `Auth currentUser: ${auth.currentUser ? 'SÍ' : 'NO'}\n`;
      if (auth.currentUser) {
        log += `Auth UID: ${auth.currentUser.uid}\n`;
        log += `Auth email: ${auth.currentUser.email}\n`;
      }
      log += '\n';
      
      // 3. Verificar colección 'empresas'
      log += '3. Verificando colección "empresas"...\n';
      const empresasCollection = collection(firestore, 'empresas');
      const empresasSnapshot = await getDocs(empresasCollection);
      
      log += `Número de documentos en 'empresas': ${empresasSnapshot.size}\n`;
      log += `¿Está vacía?: ${empresasSnapshot.empty}\n\n`;
      
      if (!empresasSnapshot.empty) {
        log += '4. Documentos encontrados en "empresas":\n';
        empresasSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          log += `\nDocumento:\n`;
          log += `  ID: ${docSnap.id}\n`;
          log += `  Datos: ${JSON.stringify(data, null, 2)}\n`;
        });
      }
      
      // 4. Intentar crear un documento de prueba
      log += '\n5. Intentando crear documento de prueba...\n';
      try {
        const testDoc = await addDoc(collection(firestore, 'empresas'), {
          nombre: 'Empresa Test Debug',
          createdAt: new Date(),
          debug: true
        });
        log += `Documento de prueba creado exitosamente con ID: ${testDoc.id}\n`;
        
        // Intentar leer el documento recién creado
        const createdDoc = await getDoc(testDoc);
        if (createdDoc.exists()) {
          log += `Documento de prueba leído exitosamente: ${JSON.stringify(createdDoc.data())}\n`;
        } else {
          log += `ERROR: No se pudo leer el documento recién creado\n`;
        }
      } catch (createError) {
        log += `ERROR al crear documento de prueba: ${String(createError)}\n`;
      }
      
      // 5. Verificar permisos específicos
      log += '\n6. Verificando permisos específicos...\n';
      try {
        // Intentar leer la colección nuevamente después de crear el documento
        const empresasSnapshot2 = await getDocs(empresasCollection);
        log += `Segunda verificación - Documentos en 'empresas': ${empresasSnapshot2.size}\n`;
        
        if (empresasSnapshot2.size > 0) {
          log += 'Documentos encontrados en segunda verificación:\n';
          empresasSnapshot2.forEach((docSnap) => {
            log += `  - ${docSnap.id}: ${JSON.stringify(docSnap.data(), null, 1)}\n`;
          });
        }
      } catch (permError) {
        log += `ERROR en verificación de permisos: ${String(permError)}\n`;
      }
      
      setResultado(log);
      
    } catch (error) {
      setResultado(`ERROR GENERAL: ${String(error)}\n\nStack trace: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    } finally {
      setLoading(false);
    }
  };

  const verificarConfiguracion = () => {
    let log = 'VERIFICACIÓN DE CONFIGURACIÓN\n\n';
    
    log += '1. Variables de entorno:\n';
    log += `NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NO DEFINIDO'}\n`;
    log += `NEXT_PUBLIC_FIREBASE_API_KEY: ${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'DEFINIDO' : 'NO DEFINIDO'}\n`;
    log += `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'NO DEFINIDO'}\n\n`;
    
    log += '2. Configuración de Firebase:\n';
    log += `Firestore inicializado: ${firestore ? 'SÍ' : 'NO'}\n`;
    log += `Auth inicializado: ${auth ? 'SÍ' : 'NO'}\n\n`;
    
    log += '3. Estado de autenticación:\n';
    log += `useAuth user: ${user ? 'SÍ' : 'NO'}\n`;
    log += `auth.currentUser: ${auth.currentUser ? 'SÍ' : 'NO'}\n`;
    
    setResultado(log);
  };

  const limpiarDocumentosPrueba = async () => {
    setLoading(true);
    try {
      const empresasSnapshot = await getDocs(collection(firestore, 'empresas'));
      let deleted = 0;
      
      for (const docSnap of empresasSnapshot.docs) {
        const data = docSnap.data();
        if (data.debug === true) {
          await deleteDoc(docSnap.ref);
          deleted++;
        }
      }
      
      setResultado(`Documentos de prueba eliminados: ${deleted}`);
    } catch (error) {
      setResultado(`Error al limpiar documentos: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const probarFirebaseFunction = async () => {
    setLoading(true);
    try {
      let log = 'PRUEBA DE FIREBASE FUNCTION\n\n';
      
      // Datos de prueba que simula lo que envía Google Sheets
      const testData = {
        "CLIENTE": "EMPRESA_PRUEBA",
        "SUCURSAL": "SUCURSAL_PRUEBA",
        "FECHAS DE MEDICIÓN": "2025-01-04",
        "TÉCNICOS": "Técnico de Prueba",
        "SERVICIO": "V2",
        "PUESTA A TIERRA": "PENDIENTE",
        "test": true
      };
      
      log += '1. Enviando datos de prueba a Firebase Function...\n';
      log += `Datos a enviar: ${JSON.stringify(testData, null, 2)}\n\n`;
      
      // URL de la función (la misma que usa Google Sheets)
      const functionUrl = "https://us-central1-opting-d998e.cloudfunctions.net/syncFromGoogleSheets";
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      
      const responseData = await response.json();
      
      log += '2. Respuesta de Firebase Function:\n';
      log += `Status: ${response.status}\n`;
      log += `Response: ${JSON.stringify(responseData, null, 2)}\n\n`;
      
      if (response.ok) {
        log += '3. Verificando si se creó el documento de empresa...\n';
        
        // Esperar un poco para que se procese
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const empresasSnapshot = await getDocs(collection(firestore, 'empresas'));
        log += `Documentos en 'empresas' después de la prueba: ${empresasSnapshot.size}\n`;
        
        let empresaPruebaEncontrada = false;
        empresasSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          log += `  - ${docSnap.id}: ${JSON.stringify(data, null, 1)}\n`;
          if (docSnap.id === 'EMPRESA_PRUEBA') {
            empresaPruebaEncontrada = true;
          }
        });
        
        log += `\n¿Se creó la empresa de prueba?: ${empresaPruebaEncontrada ? 'SÍ' : 'NO'}\n`;
        
        if (empresaPruebaEncontrada) {
          log += '\n✅ ¡ÉXITO! La función actualizada está funcionando correctamente.\n';
          log += 'Ahora deberías poder ver las empresas reales en tu aplicación.\n';
        }
      } else {
        log += '❌ Error al llamar a la función de Firebase.\n';
      }
      
      setResultado(log);
      
    } catch (error) {
      setResultado(`ERROR al probar Firebase Function: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Página de Depuración - Firestore</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={verificarConfiguracion}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Verificar Configuración
        </button>
        
        <button
          onClick={verificarFirestore}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? 'Verificando...' : 'Verificar Firestore'}
        </button>
        
        <button
          onClick={verificarEmpresasYSucursales}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
        >
          {loading ? 'Verificando...' : 'Verificar Empresas y Sucursales'}
        </button>
        
        <button
          onClick={probarFirebaseFunction}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
        >
          {loading ? 'Probando...' : 'Probar Firebase Function'}
        </button>
        
        <button
          onClick={limpiarDocumentosPrueba}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
        >
          {loading ? 'Limpiando...' : 'Limpiar Documentos de Prueba'}
        </button>
      </div>
      
      {resultado && (
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Resultado:</h2>
          <pre className="whitespace-pre-wrap text-sm">{resultado}</pre>
        </div>
      )}
    </div>
  );
} 