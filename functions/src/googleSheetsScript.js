/**
 * Script para enviar datos desde Google Sheets a Firebase Functions
 * 
 * Este script se debe agregar a tu hoja de cálculo de Google Sheets.
 * Para usarlo:
 * 1. En Google Sheets, ve a Extensiones > Apps Script
 * 2. Copia y pega este código
 * 3. Reemplaza la URL con la URL de tu función de Firebase
 * 4. Guarda el script y autorízalo
 */

// URL de la función de Firebase (reemplazar con tu URL)
const FIREBASE_FUNCTION_URL = "https://us-central1-opting-d998e.cloudfunctions.net/syncFromGoogleSheets";

// Campos requeridos y sus posibles variantes con espacios o saltos de línea
const CAMPOS_REQUERIDOS = {
  "CLIENTE": ["CLIENTE"],
  "SUCURSAL": ["SUCURSAL"],
  "FECHAS DE MEDICIÓN": ["FECHAS DE MEDICIÓN", "FECHAS DE \nMEDICIÓN", "FECHAS DE\nMEDICIÓN"]
};

/**
 * Función para normalizar encabezados (eliminar espacios extra y saltos de línea)
 */
function normalizarEncabezado(header) {
  if (!header) return "";
  
  // Convertir a string si no lo es
  const headerStr = String(header);
  
  // Reemplazar saltos de línea por espacios y eliminar espacios extra
  return headerStr.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Función para encontrar el encabezado normalizado que corresponde a un campo requerido
 */
function encontrarCampoRequerido(header) {
  const headerNormalizado = normalizarEncabezado(header);
  
  for (const [campo, variantes] of Object.entries(CAMPOS_REQUERIDOS)) {
    const variantesNormalizadas = variantes.map(v => normalizarEncabezado(v));
    if (variantesNormalizadas.includes(headerNormalizado)) {
      return campo;
    }
  }
  
  return null;
}

/**
 * Función que se ejecuta cuando se edita una celda
 * NOTA: Esta función es un trigger que Google Sheets llama automáticamente.
 * No debe ejecutarse manualmente desde el editor.
 */
function onEdit(e) {
  // Si no hay evento, salir (esto ocurre si se ejecuta manualmente)
  if (!e || !e.source) {
    Logger.log("Esta función está diseñada para ser un trigger automático, no para ejecutarse manualmente.");
    Logger.log("Por favor usa 'enviarFilaSeleccionada' o 'enviarTodasLasFilas' desde el menú de la hoja.");
    return;
  }
  
  const sheet = e.source.getActiveSheet();
  const row = e.range.getRow();
  
  // Ignorar ediciones en la fila de encabezado
  if (row === 1) return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(row, 1, 1, headers.length).getValues()[0];

  const data = {};
  const camposEncontrados = {
    "CLIENTE": false,
    "SUCURSAL": false,
    "FECHAS DE MEDICIÓN": false
  };
  
  headers.forEach((h, i) => {
    if (!h) return;
    
    // Normalizar el encabezado para buscar coincidencias
    const campoRequerido = encontrarCampoRequerido(h);
    
    if (campoRequerido) {
      // Si es un campo requerido, usamos el nombre estándar
      data[campoRequerido] = values[i] || "";
      camposEncontrados[campoRequerido] = true;
    } else {
      // Para otros campos, usamos el encabezado normalizado
      const header = normalizarEncabezado(h);
      data[header] = values[i] || "";
    }
  });

  // Verificar que los campos requeridos existan
  if (!camposEncontrados["FECHAS DE MEDICIÓN"] || !camposEncontrados["CLIENTE"] || !camposEncontrados["SUCURSAL"]) {
    Logger.log("Faltan campos obligatorios: FECHAS DE MEDICIÓN, CLIENTE o SUCURSAL");
    return;
  }

  const options = {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(data),
    muteHttpExceptions: true // Para evitar que los errores HTTP interrumpan la ejecución
  };

  try {
    const response = UrlFetchApp.fetch(FIREBASE_FUNCTION_URL, options);
    Logger.log("Respuesta del servidor: " + response.getContentText());
    
    // Opcional: Marcar la fila como sincronizada
    // sheet.getRange(row, headers.length + 1).setValue("Sincronizado: " + new Date());
  } catch (error) {
    Logger.log("Error al enviar datos: " + error);
  }
}

/**
 * Función para probar la conexión con Firebase
 * Esta función se puede ejecutar manualmente desde el editor
 */
function probarConexion() {
  try {
    const testData = {
      "CLIENTE": "CLIENTE_PRUEBA",
      "SUCURSAL": "SUCURSAL_PRUEBA",
      "FECHAS DE MEDICIÓN": "01/01/2025",
      "test": true
    };
    
    Logger.log("Datos de prueba a enviar: " + JSON.stringify(testData));
    Logger.log("URL de destino: " + FIREBASE_FUNCTION_URL);
    
    const options = {
      method: "POST",
      contentType: "application/json",
      payload: JSON.stringify(testData),
      muteHttpExceptions: true
    };
    
    Logger.log("Enviando solicitud...");
    const response = UrlFetchApp.fetch(FIREBASE_FUNCTION_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log("Código de respuesta: " + responseCode);
    Logger.log("Respuesta del servidor: " + responseText);
    
    // Mostrar una alerta con el resultado
    if (responseCode === 200) {
      SpreadsheetApp.getUi().alert("Conexión exitosa con Firebase. Verifica los logs para más detalles.");
    } else {
      SpreadsheetApp.getUi().alert("Error al conectar con Firebase. Código: " + responseCode + "\nRespuesta: " + responseText);
    }
    
    return "Prueba completada. Verifica los logs para ver los resultados.";
  } catch (error) {
    Logger.log("Error al conectar con Firebase: " + error);
    SpreadsheetApp.getUi().alert("Error al conectar con Firebase: " + error);
    return "Error al conectar con Firebase. Verifica los logs para más detalles.";
  }
}

/**
 * Función para verificar los encabezados de la hoja
 * y asegurarse de que existan los campos requeridos
 */
function verificarEncabezados() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Convertir los encabezados a strings y normalizar
  const headersNormalizados = headers.map(h => h ? normalizarEncabezado(h) : "");
  
  // Verificar los campos requeridos
  const camposEncontrados = {};
  const camposFaltantes = [];
  
  // Inicializar todos los campos como no encontrados
  Object.keys(CAMPOS_REQUERIDOS).forEach(campo => {
    camposEncontrados[campo] = false;
  });
  
  // Buscar cada encabezado para ver si corresponde a un campo requerido
  headers.forEach((h, i) => {
    const campoRequerido = encontrarCampoRequerido(h);
    if (campoRequerido) {
      camposEncontrados[campoRequerido] = true;
      Logger.log(`Campo '${campoRequerido}' encontrado como '${h}' en columna ${i+1}`);
    }
  });
  
  // Verificar qué campos faltan
  Object.keys(camposEncontrados).forEach(campo => {
    if (!camposEncontrados[campo]) {
      camposFaltantes.push(campo);
    }
  });
  
  // Mostrar el resultado
  if (camposFaltantes.length === 0) {
    SpreadsheetApp.getUi().alert("Todos los campos requeridos están presentes en la hoja.");
    Logger.log("Encabezados encontrados: " + headersNormalizados.join(", "));
  } else {
    SpreadsheetApp.getUi().alert("Faltan los siguientes campos requeridos: " + camposFaltantes.join(", ") + 
                              "\n\nRecuerda que los campos deben escribirse exactamente como: FECHAS DE MEDICIÓN, CLIENTE, SUCURSAL");
    Logger.log("Encabezados encontrados: " + headersNormalizados.join(", "));
    Logger.log("Campos faltantes: " + camposFaltantes.join(", "));
  }
  
  // Mostrar los encabezados actuales y su normalización
  Logger.log("--- Análisis de encabezados ---");
  headers.forEach((h, i) => {
    if (h) {
      const normalizado = normalizarEncabezado(h);
      const campoRequerido = encontrarCampoRequerido(h);
      Logger.log(`Columna ${i+1}: '${h}' -> Normalizado: '${normalizado}' -> Campo requerido: ${campoRequerido || 'No es campo requerido'}`);
    }
  });
}

/**
 * Función para enviar manualmente los datos de una fila seleccionada
 */
function enviarFilaSeleccionada() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const activeRange = SpreadsheetApp.getActiveRange();
  const row = activeRange.getRow();
  
  // Ignorar si se selecciona la fila de encabezado
  if (row === 1) {
    SpreadsheetApp.getUi().alert('No se puede enviar la fila de encabezado');
    return;
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  
  const data = {};
  const camposEncontrados = {
    "CLIENTE": false,
    "SUCURSAL": false,
    "FECHAS DE MEDICIÓN": false
  };
  
  headers.forEach((h, i) => {
    if (!h) return;
    
    // Normalizar el encabezado para buscar coincidencias
    const campoRequerido = encontrarCampoRequerido(h);
    
    if (campoRequerido) {
      // Si es un campo requerido, usamos el nombre estándar
      data[campoRequerido] = values[i] || "";
      camposEncontrados[campoRequerido] = true;
    } else {
      // Para otros campos, usamos el encabezado normalizado
      const header = normalizarEncabezado(h);
      data[header] = values[i] || "";
    }
  });
  
  // Verificar que los campos requeridos existan
  if (!camposEncontrados["FECHAS DE MEDICIÓN"] || !camposEncontrados["CLIENTE"] || !camposEncontrados["SUCURSAL"]) {
    SpreadsheetApp.getUi().alert('Faltan campos obligatorios: FECHAS DE MEDICIÓN, CLIENTE o SUCURSAL');
    Logger.log("Datos incompletos: " + JSON.stringify(data));
    Logger.log("Campos encontrados: " + JSON.stringify(camposEncontrados));
    return;
  }
  
  // Mostrar los datos que se van a enviar
  Logger.log("Enviando datos: " + JSON.stringify(data));
  
  const options = {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(FIREBASE_FUNCTION_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log("Código de respuesta: " + responseCode);
    Logger.log("Respuesta del servidor: " + responseText);
    
    if (responseCode === 200) {
      SpreadsheetApp.getUi().alert('Datos enviados correctamente a Firebase');
      // Opcional: Marcar la fila como sincronizada
      sheet.getRange(row, headers.length + 1).setValue("Sincronizado: " + new Date());
    } else {
      SpreadsheetApp.getUi().alert('Error al enviar datos. Código: ' + responseCode + '\nRespuesta: ' + responseText);
    }
  } catch (error) {
    Logger.log("Error al enviar datos: " + error);
    SpreadsheetApp.getUi().alert('Error al enviar datos: ' + error);
  }
}

/**
 * Función para enviar todas las filas de datos
 */
function enviarTodasLasFilas() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  // Obtener encabezados
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Mapear los índices de los campos requeridos
  const camposIndices = {};
  headers.forEach((h, i) => {
    const campoRequerido = encontrarCampoRequerido(h);
    if (campoRequerido) {
      camposIndices[campoRequerido] = i;
      Logger.log(`Campo '${campoRequerido}' encontrado en columna ${i+1}`);
    }
  });
  
  // Verificar que se encontraron todos los campos requeridos
  const camposRequeridos = Object.keys(CAMPOS_REQUERIDOS);
  const camposFaltantes = camposRequeridos.filter(campo => !(campo in camposIndices));
  
  if (camposFaltantes.length > 0) {
    SpreadsheetApp.getUi().alert(`No se encontraron los siguientes campos requeridos: ${camposFaltantes.join(", ")}`);
    return;
  }
  
  // Contador para filas enviadas y fallidas
  let enviadas = 0;
  let fallidas = 0;
  
  // Para cada fila de datos (excluyendo la fila de encabezado)
  for (let row = 2; row <= lastRow; row++) {
    const values = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
    
    const data = {};
    
    // Primero agregamos los campos requeridos
    let camposValidos = true;
    camposRequeridos.forEach(campo => {
      const valor = values[camposIndices[campo]];
      data[campo] = valor || "";
      if (!valor) {
        camposValidos = false;
        Logger.log(`Fila ${row}: Falta valor para campo '${campo}'`);
      }
    });
    
    // Si falta algún campo requerido, saltamos esta fila
    if (!camposValidos) {
      Logger.log(`Fila ${row}: Faltan campos obligatorios`);
      fallidas++;
      continue;
    }
    
    // Agregamos el resto de los campos
    headers.forEach((h, i) => {
      if (!h) return;
      
      const campoRequerido = encontrarCampoRequerido(h);
      if (!campoRequerido) { // Si no es un campo requerido (ya agregado)
        const header = normalizarEncabezado(h);
        data[header] = values[i] || "";
      }
    });
    
    Logger.log(`Fila ${row}: Enviando datos: ${JSON.stringify(data)}`);
    
    const options = {
      method: "POST",
      contentType: "application/json",
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    };
    
    try {
      const response = UrlFetchApp.fetch(FIREBASE_FUNCTION_URL, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      Logger.log(`Fila ${row}: Código de respuesta: ${responseCode}`);
      Logger.log(`Fila ${row}: Respuesta del servidor: ${responseText}`);
      
      if (responseCode === 200) {
        enviadas++;
        // Opcional: Marcar como sincronizado
        sheet.getRange(row, headers.length + 1).setValue("Sincronizado: " + new Date());
      } else {
        fallidas++;
        Logger.log(`Fila ${row}: Error - Código ${responseCode}: ${responseText}`);
      }
    } catch (error) {
      Logger.log(`Error en fila ${row}: ${error}`);
      fallidas++;
    }
    
    // Pequeña pausa para evitar alcanzar límites de API
    Utilities.sleep(100);
  }
  
  SpreadsheetApp.getUi().alert(`Proceso completado:\n- Filas enviadas: ${enviadas}\n- Filas fallidas: ${fallidas}`);
}

/**
 * Función para crear un menú personalizado
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Sincronización con Firebase')
    .addItem('Verificar encabezados', 'verificarEncabezados')
    .addItem('Probar conexión', 'probarConexion')
    .addSeparator()
    .addItem('Enviar fila seleccionada', 'enviarFilaSeleccionada')
    .addItem('Enviar todas las filas', 'enviarTodasLasFilas')
    .addToUi();
} 