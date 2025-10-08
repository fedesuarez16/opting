# Integración OneDrive con Microsoft Graph

Esta documentación explica cómo configurar y usar la integración de OneDrive con Microsoft Graph en tu aplicación Next.js.

## 📋 Requisitos Previos

### 1. Configuración de Azure Active Directory

1. Ve al [Portal de Azure](https://portal.azure.com/)
2. Navega a "Azure Active Directory" > "App registrations"
3. Crea una nueva aplicación o usa una existente
4. Configura los permisos de API:
   - Microsoft Graph > Application permissions
   - Agrega: `Files.Read.All` y `Sites.Read.All`
5. Otorga consentimiento de administrador para estos permisos
6. En "Certificates & secrets", crea un nuevo client secret

### 2. Variables de Entorno

Agrega estas variables a tu archivo `.env.local`:

```env
# Azure/Microsoft Graph Configuration
AZURE_TENANT_ID=tu-tenant-id
AZURE_CLIENT_ID=tu-client-id
AZURE_CLIENT_SECRET=tu-client-secret
```

### 3. Dependencias

Las siguientes dependencias ya están instaladas:

```bash
npm install @azure/msal-node axios
```

## 🏗️ Estructura de la Integración

### API Route: `/api/onedrive/[clientId]`

**Ubicación:** `src/app/api/onedrive/[clientId]/route.ts`

**Funcionalidad:**
- Busca el cliente en Firestore por `clientId`
- Obtiene un access token de Microsoft Graph usando client credentials
- Consulta los archivos de la carpeta OneDrive del cliente
- Devuelve una lista formateada de archivos

**Endpoint:** `GET /api/onedrive/{clientId}`

**Respuesta exitosa:**
```json
{
  "success": true,
  "clientId": "EMPRESA_EJEMPLO",
  "clientName": "Empresa Ejemplo S.A.",
  "files": [
    {
      "id": "file-id-123",
      "name": "documento.pdf",
      "url": "https://graph.microsoft.com/v1.0/me/drive/items/...",
      "size": 1024000,
      "lastModified": "2023-10-01T10:00:00Z",
      "created": "2023-09-15T08:30:00Z"
    }
  ],
  "totalFiles": 1
}
```

**Respuesta de error:**
```json
{
  "error": "Client not found",
  "details": "Additional error information (development only)"
}
```

### Componente React: `ClientFiles`

**Ubicación:** `src/components/ClientFiles.tsx`

**Props:**
- `clientId: string` - ID del cliente en Firestore

**Características:**
- Carga automática de archivos
- Estados de loading y error
- Enlaces de descarga directa
- Información de metadatos
- Iconos por tipo de archivo
- Interfaz responsive

**Ejemplo de uso:**
```jsx
import ClientFiles from '@/components/ClientFiles';

function MiComponente() {
  return (
    <div>
      <ClientFiles clientId="EMPRESA_EJEMPLO" />
    </div>
  );
}
```

## 🗃️ Estructura de Base de Datos

### Firestore - Colección `empresas`

Cada documento de empresa debe incluir el campo `oneDriveFolderId`:

```json
{
  "nombre": "Empresa Ejemplo S.A.",
  "direccion": "Calle Falsa 123",
  "telefono": "+54 11 1234-5678",
  "email": "contacto@empresa.com",
  "oneDriveFolderId": "01ABCDEFGHIJKLMNOPQRSTUVWXYZ"
}
```

### Cómo obtener el OneDrive Folder ID

#### 🎯 **Método Recomendado: Usar la Página de Setup (MÁS FÁCIL)**

Visita `/dashboard/onedrive-setup` en tu aplicación para:
- ✅ Listar todas las carpetas de OneDrive
- ✅ Buscar carpetas por nombre
- ✅ Copiar IDs con un solo click
- ✅ Ver información detallada de cada carpeta

Esta página incluye una interfaz visual que facilita enormemente la tarea.

#### Métodos Alternativos:

1. **Método 1 - URL de OneDrive:**
   - Navega a la carpeta en OneDrive web
   - La URL contiene el ID: `https://onedrive.live.com/?id=01ABCDEFGHIJKLMNOPQRSTUVWXYZ`

2. **Método 2 - Microsoft Graph Explorer:**
   - Ve a [Graph Explorer](https://developer.microsoft.com/graph/graph-explorer)
   - Ejecuta: `GET https://graph.microsoft.com/v1.0/me/drive/root/children`
   - Busca la carpeta por nombre y copia su `id`

3. **Método 3 - API Helper:**
   Usa los endpoints de ayuda:
   ```bash
   # Listar carpetas raíz
   GET /api/onedrive/helpers?action=list-root-folders
   
   # Buscar por nombre
   GET /api/onedrive/helpers?action=search-folder&folderName=ClienteX
   
   # Info de carpeta específica
   GET /api/onedrive/helpers?action=get-folder-info&folderId=FOLDER_ID
   ```

4. **Método 4 - Compartir Link:**
   - Haz clic derecho en la carpeta → "Compartir"
   - Copia el link. El ID estará en la URL compartida

## 🔧 Configuración y Uso

### 1. Configurar un Cliente

```javascript
// Ejemplo: Agregar oneDriveFolderId a un cliente existente
import { adminFirestore } from '@/lib/firebaseAdmin';

await adminFirestore
  .collection('empresas')
  .doc('EMPRESA_EJEMPLO')
  .update({
    oneDriveFolderId: '01ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  });
```

### 2. Usar el Componente

```jsx
'use client';

import ClientFiles from '@/components/ClientFiles';

export default function ClientePage({ params }) {
  return (
    <div className="p-8">
      <h1>Archivos del Cliente</h1>
      <ClientFiles clientId={params.clientId} />
    </div>
  );
}
```

### 3. Página de Ejemplo

Visita `/dashboard/client-files-example` para ver una demostración completa del componente.

## 🛠️ Manejo de Errores

### Errores Comunes

1. **"Client not found"**
   - El cliente no existe en Firestore
   - Verifica el `clientId`

2. **"Client does not have an assigned OneDrive folder"**
   - El campo `oneDriveFolderId` no está configurado
   - Agrega el ID de carpeta al documento del cliente

3. **"Azure configuration is missing"**
   - Variables de entorno no configuradas
   - Verifica `.env.local`

4. **"OneDrive folder not found"**
   - El `oneDriveFolderId` no es válido
   - Verifica que la carpeta existe en OneDrive

5. **"Access denied to OneDrive folder"**
   - Permisos insuficientes en Azure AD
   - Verifica los permisos de la aplicación

### Logs y Debugging

En desarrollo, los errores incluyen stack traces detallados. En producción, solo se muestran mensajes de error seguros.

```javascript
// Habilitar logs detallados (solo desarrollo)
console.log('NODE_ENV:', process.env.NODE_ENV);
```

## 🔒 Seguridad

### Permisos Mínimos

La aplicación usa los permisos mínimos necesarios:
- `Files.Read.All`: Leer archivos de OneDrive
- `Sites.Read.All`: Acceso a sitios de SharePoint (si es necesario)

### Client Credentials Flow

Se usa el flujo de credenciales de cliente (server-to-server) que es más seguro que el flujo de autorización de usuario para aplicaciones backend.

### Variables de Entorno

**NUNCA** hardcodees las credenciales en el código. Siempre usa variables de entorno:

```javascript
// ✅ Correcto
const clientId = process.env.AZURE_CLIENT_ID;

// ❌ Incorrecto
const clientId = 'tu-client-id-aqui';
```

## 📊 Monitoreo y Métricas

### Logs de Aplicación

Todos los errores se registran en la consola del servidor:

```javascript
console.error('Error in OneDrive API:', error);
```

### Métricas Recomendadas

- Tiempo de respuesta de la API
- Tasa de errores por tipo
- Número de archivos por cliente
- Uso de ancho de banda

## 🚀 Próximas Mejoras

### Funcionalidades Sugeridas

1. **Cache de archivos:** Implementar cache Redis para mejorar rendimiento
2. **Paginación:** Para carpetas con muchos archivos
3. **Filtros:** Buscar archivos por nombre, tipo, fecha
4. **Upload:** Permitir subir archivos desde la aplicación
5. **Thumbnails:** Mostrar previsualizaciones de imágenes
6. **Sync:** Sincronización automática con webhooks

### Optimizaciones

1. **Lazy loading:** Cargar archivos bajo demanda
2. **Batch requests:** Agrupar múltiples solicitudes
3. **CDN:** Usar CDN para archivos estáticos
4. **Compression:** Comprimir respuestas de API

## 📞 Soporte

Para problemas o preguntas sobre esta integración:

1. Revisa los logs de la aplicación
2. Verifica la configuración de Azure AD
3. Consulta la documentación de Microsoft Graph
4. Usa la página de ejemplo para debugging

---

**Última actualización:** Octubre 2025
**Versión:** 1.0.0
