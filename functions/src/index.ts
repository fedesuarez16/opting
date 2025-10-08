import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import cors from "cors";

// Inicializar la aplicación de Firebase
admin.initializeApp();
const firestore = admin.firestore();

// Configurar CORS para permitir solicitudes desde cualquier origen
const corsHandler = cors({ origin: true });

// Función HTTP para recibir datos desde Google Sheets
export const syncFromGoogleSheets = functions.https.onRequest((request, response) => {
  return corsHandler(request, response, async () => {
    try {
      // Solo permitir solicitudes POST
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      logger.info("Recibida solicitud POST a syncFromGoogleSheets");
      
      // Obtener los datos del cuerpo de la solicitud
      const data = request.body;
      logger.info("Datos recibidos:", JSON.stringify(data, null, 2));
      
      // Validar campos requeridos
      if (!data.CLIENTE || !data.SUCURSAL || !data["FECHAS DE MEDICIÓN"]) {
        logger.error("Faltan campos requeridos:", { 
          cliente: data.CLIENTE, 
          sucursal: data.SUCURSAL, 
          fecha: data["FECHAS DE MEDICIÓN"] 
        });
        
        response.status(400).json({
          error: "Missing required fields: CLIENTE, SUCURSAL, or FECHAS DE MEDICIÓN"
        });
        return;
      }

      // Formatear la fecha para el ID del documento (reemplazar / con -)
      const formattedDate = data["FECHAS DE MEDICIÓN"].replace(/\//g, "-");
      logger.info("Fecha formateada:", formattedDate);
      
      // Crear la referencia del documento con la estructura de ruta
      // /empresas/{CLIENTE}/sucursales/{SUCURSAL}/mediciones/{fecha-formateada}
      const docPath = `empresas/${data.CLIENTE}/sucursales/${data.SUCURSAL}/mediciones/${formattedDate}`;
      logger.info("Ruta del documento:", docPath);
      
      // Guardar los datos en Firestore
      logger.info("Guardando datos en Firestore...");
      
      // 1. Crear/actualizar el documento de empresa en la colección principal
      const empresaRef = firestore.collection("empresas").doc(data.CLIENTE);
      await empresaRef.set({
        nombre: data.CLIENTE,
        ultimaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        // Mantener otros campos si ya existen
      }, { merge: true });
      
      logger.info("Documento de empresa creado/actualizado:", data.CLIENTE);
      
      // 2. Crear/actualizar el documento de sucursal
      const sucursalRef = empresaRef.collection("sucursales").doc(data.SUCURSAL);
      await sucursalRef.set({
        nombre: data.SUCURSAL,
        empresa: data.CLIENTE,
        ultimaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        // Mantener otros campos si ya existen
      }, { merge: true });
      
      logger.info("Documento de sucursal creado/actualizado:", data.SUCURSAL);
      
      // 3. Guardar la medición específica
      await sucursalRef
        .collection("mediciones")
        .doc(formattedDate)
        .set({
          ...data,
          fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
        });
      
      logger.info("Datos guardados correctamente en Firestore");
      
      // Enviar respuesta exitosa
      response.status(200).json({
        success: true,
        message: "Data synced to Firebase successfully",
        path: docPath,
        empresa: data.CLIENTE,
        sucursal: data.SUCURSAL
      });
    } catch (error: any) {
      logger.error("Error syncing data to Firebase:", error);
      
      // Intentar extraer un mensaje de error más útil
      const errorMessage = error.message || String(error);
      const errorCode = error.code || "unknown";
      
      response.status(500).json({
        error: "Failed to sync data to Firebase",
        details: errorMessage,
        code: errorCode
      });
    }
  });
}); 