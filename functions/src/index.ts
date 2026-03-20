import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import * as cors from "cors";

admin.initializeApp();
const firestore = admin.firestore();
const corsHandler = cors({ origin: true });

// ─────────────────────────────────────────────
// ESTUDIOS 2026
// empresas/{CLIENTE}/sucursales/{SUCURSAL}/mediciones/{fecha}
// ─────────────────────────────────────────────
export const syncFromGoogleSheets = functions.https.onRequest((request, response) => {
  return corsHandler(request, response, async () => {
    try {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      const data = request.body;
      logger.info("syncFromGoogleSheets - Datos recibidos:", JSON.stringify(data, null, 2));

      if (!data.CLIENTE || !data.SUCURSAL || !data["FECHAS DE MEDICIÓN"]) {
        response.status(400).json({
          error: "Missing required fields: CLIENTE, SUCURSAL, or FECHAS DE MEDICIÓN"
        });
        return;
      }

      const formattedDate = data["FECHAS DE MEDICIÓN"].replace(/\//g, "-");
      const docPath = `empresas/${data.CLIENTE}/sucursales/${data.SUCURSAL}/mediciones/${formattedDate}`;

      const empresaRef = firestore.collection("empresas").doc(data.CLIENTE);
      await empresaRef.set({
        nombre: data.CLIENTE,
        ultimaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      const sucursalRef = empresaRef.collection("sucursales").doc(data.SUCURSAL);
      await sucursalRef.set({
        nombre: data.SUCURSAL,
        empresa: data.CLIENTE,
        ultimaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      await sucursalRef
        .collection("mediciones")
        .doc(formattedDate)
        .set({
          ...data,
          fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
        });

      response.status(200).json({
        success: true,
        message: "Data synced to Firebase successfully",
        path: docPath
      });

    } catch (error: any) {
      logger.error("Error en syncFromGoogleSheets:", error);
      response.status(500).json({
        error: "Failed to sync data to Firebase",
        details: error.message || String(error)
      });
    }
  });
});

// ─────────────────────────────────────────────
// COBERTURA LEGAL - por sucursal
// cobertura_legal/{SUCURSAL}
// ─────────────────────────────────────────────
export const syncCoberturaLegal = functions.https.onRequest((request, response) => {
  return corsHandler(request, response, async () => {
    try {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      const data = request.body;
      logger.info("syncCoberturaLegal - Datos recibidos:", JSON.stringify(data, null, 2));

      if (!data.CLIENTE || !data.SUCURSAL || !data["FECHAS DE MEDICIÓN"]) {
        response.status(400).json({
          error: "Missing required fields: CLIENTE, SUCURSAL, or FECHAS DE MEDICIÓN"
        });
        return;
      }

      const docId = data.SUCURSAL;

      await firestore
        .collection("cobertura_legal")
        .doc(docId)
        .set({
          ...data,
          fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
        });

      response.status(200).json({
        success: true,
        message: "Cobertura Legal synced successfully",
        path: `cobertura_legal/${docId}`
      });

    } catch (error: any) {
      logger.error("Error en syncCoberturaLegal:", error);
      response.status(500).json({
        error: "Failed to sync Cobertura Legal",
        details: error.message || String(error)
      });
    }
  });
});

// ─────────────────────────────────────────────
// COBERTURA LEGAL - por provincia
// coberturaLegal/{CLIENTE}/provincias/{PROVINCIA}
// ─────────────────────────────────────────────
export const syncCoberturaLegalProvincia = functions.https.onRequest((request, response) => {
  return corsHandler(request, response, async () => {
    try {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      const data = request.body;
      logger.info("syncCoberturaLegalProvincia - Datos recibidos:", JSON.stringify(data, null, 2));

      if (!data.CLIENTE || !data.PROVINCIA || !data["FECHAS DE MEDICIÓN"]) {
        response.status(400).json({
          error: "Missing required fields: CLIENTE, PROVINCIA, or FECHAS DE MEDICIÓN"
        });
        return;
      }

      await firestore
        .collection("coberturaLegal")
        .doc(data.CLIENTE)
        .collection("provincias")
        .doc(data.PROVINCIA)
        .set({
          ...data,
          fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

      response.status(200).json({
        success: true,
        message: "Cobertura Legal Provincial synced successfully",
        path: `coberturaLegal/${data.CLIENTE}/provincias/${data.PROVINCIA}`
      });

    } catch (error: any) {
      logger.error("Error en syncCoberturaLegalProvincia:", error);
      response.status(500).json({
        error: "Failed to sync Cobertura Legal Provincial",
        details: error.message || String(error)
      });
    }
  });
});