# 📁 Cómo Obtener el OneDrive Folder ID

El `oneDriveFolderId` es el identificador único de cada carpeta en OneDrive. Este ID es necesario para vincular las carpetas de OneDrive con tus clientes en la aplicación.

## 🚀 Método Más Fácil (RECOMENDADO)

### Usa la Página de Setup Integrada

1. **Navega a la página de configuración:**
   ```
   http://localhost:3000/dashboard/onedrive-setup
   ```

2. **Opciones disponibles:**
   - **Listar Carpetas Raíz:** Muestra todas las carpetas en la raíz de tu OneDrive
   - **Buscar Carpeta:** Busca una carpeta específica por nombre

3. **Copia el ID:**
   - Haz clic en el botón "Copiar ID" junto a la carpeta deseada
   - El ID se copiará automáticamente al portapapeles ✅

4. **Guarda el ID en Firestore:**
   - Ve a Firebase Console o usa el código para actualizar el cliente
   - Agrega el ID al campo `oneDriveFolderId` del cliente

---

## 📍 Métodos Alternativos

### Método 1: Desde la URL de OneDrive Web

1. Abre [OneDrive](https://onedrive.live.com) en tu navegador
2. Navega hasta la carpeta que deseas vincular
3. Observa la URL en la barra de direcciones:
   ```
   https://onedrive.live.com/?id=01ABCDEFGHIJKLMNOPQRSTUVWXYZ123456
                                    └─────────── Este es el Folder ID ─────────┘
   ```
4. Copia el valor después de `?id=`

### Método 2: Usando Graph Explorer

1. Ve a [Microsoft Graph Explorer](https://developer.microsoft.com/graph/graph-explorer)
2. Inicia sesión con tu cuenta de Microsoft
3. Ejecuta esta consulta:
   ```
   GET https://graph.microsoft.com/v1.0/me/drive/root/children
   ```
4. En la respuesta JSON, busca tu carpeta y copia el campo `id`:
   ```json
   {
     "value": [
       {
         "id": "01ABCDEFGHIJKLMNOPQRSTUVWXYZ",  // ← Este es el Folder ID
         "name": "Mi Carpeta Cliente",
         "folder": { ... }
       }
     ]
   }
   ```

### Método 3: Usando la API Helper (Programático)

Puedes usar los endpoints de ayuda directamente:

#### Listar todas las carpetas raíz:
```bash
curl http://localhost:3000/api/onedrive/helpers?action=list-root-folders
```

#### Buscar una carpeta por nombre:
```bash
curl http://localhost:3000/api/onedrive/helpers?action=search-folder&folderName=ClienteX
```

#### Obtener info de una carpeta específica:
```bash
curl http://localhost:3000/api/onedrive/helpers?action=get-folder-info&folderId=FOLDER_ID
```

### Método 4: Link de Compartir

1. En OneDrive web, haz clic derecho en la carpeta
2. Selecciona "Compartir" o "Share"
3. Copia el enlace generado
4. El enlace contendrá el ID de la carpeta

---

## 💾 Guardar el Folder ID en Firestore

### Opción 1: Firebase Console (Visual)

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a Firestore Database
4. Navega a la colección `empresas`
5. Selecciona el documento del cliente
6. Agrega o edita el campo:
   - **Campo:** `oneDriveFolderId`
   - **Tipo:** string
   - **Valor:** El ID de la carpeta copiado

### Opción 2: Código (Programático)

```typescript
import { adminFirestore } from '@/lib/firebaseAdmin';

// Actualizar cliente con el Folder ID
await adminFirestore
  .collection('empresas')
  .doc('CLIENTE_ID')  // Reemplaza con el ID real del cliente
  .update({
    oneDriveFolderId: '01ABCDEFGHIJKLMNOPQRSTUVWXYZ'  // El ID que copiaste
  });
```

### Opción 3: Al Crear un Nuevo Cliente

```typescript
import { adminFirestore } from '@/lib/firebaseAdmin';

await adminFirestore
  .collection('empresas')
  .doc('CLIENTE_ID')
  .set({
    nombre: 'Empresa Ejemplo S.A.',
    email: 'contacto@empresa.com',
    oneDriveFolderId: '01ABCDEFGHIJKLMNOPQRSTUVWXYZ',  // ← Incluir desde el inicio
    // ... otros campos
  });
```

---

## ✅ Verificar que Funciona

Después de configurar el `oneDriveFolderId`:

### 1. Usa el Componente ClientFiles

```jsx
import ClientFiles from '@/components/ClientFiles';

<ClientFiles clientId="CLIENTE_ID" />
```

### 2. O Prueba la API Directamente

```bash
curl http://localhost:3000/api/onedrive/CLIENTE_ID
```

Deberías recibir una respuesta con los archivos de la carpeta:

```json
{
  "success": true,
  "clientId": "CLIENTE_ID",
  "clientName": "Empresa Ejemplo S.A.",
  "files": [
    {
      "id": "file-123",
      "name": "documento.pdf",
      "url": "https://...",
      "size": 1024000
    }
  ],
  "totalFiles": 1
}
```

---

## 🔍 Ejemplo Visual

```
OneDrive (Raíz)
│
├── 📁 Clientes/                    ← ID: 01AAAAAAAAA
│   ├── 📁 Empresa ABC/             ← ID: 01BBBBBBBBB  ← Usa este para Empresa ABC
│   │   ├── 📄 contrato.pdf
│   │   └── 📄 factura.xlsx
│   │
│   └── 📁 Empresa XYZ/             ← ID: 01CCCCCCCCC  ← Usa este para Empresa XYZ
│       ├── 📄 proyecto.docx
│       └── 📄 presupuesto.pdf
│
└── 📁 Documentos/                  ← ID: 01DDDDDDDDD
```

En Firestore tendrías:

```
empresas/
├── EMPRESA_ABC/
│   ├── nombre: "Empresa ABC"
│   └── oneDriveFolderId: "01BBBBBBBBB"  ← ID de la carpeta "Empresa ABC"
│
└── EMPRESA_XYZ/
    ├── nombre: "Empresa XYZ"
    └── oneDriveFolderId: "01CCCCCCCCC"  ← ID de la carpeta "Empresa XYZ"
```

---

## ❓ Preguntas Frecuentes

### ¿El ID de la carpeta cambia?
No, el ID de una carpeta en OneDrive es permanente y no cambia.

### ¿Puedo usar subcarpetas?
Sí, puedes usar el ID de cualquier carpeta, esté donde esté en tu estructura de OneDrive.

### ¿Qué pasa si elimino la carpeta?
Si eliminas la carpeta de OneDrive, las solicitudes devolverán un error 404 "Folder not found".

### ¿Puedo compartir carpetas entre clientes?
No es recomendable. Cada cliente debe tener su propia carpeta con un ID único.

### ¿Funciona con SharePoint?
Sí, el mismo proceso funciona con carpetas en SharePoint. Solo necesitas los permisos adecuados en Azure AD.

---

## 🆘 Solución de Problemas

### Error: "Client does not have an assigned OneDrive folder"
**Causa:** El campo `oneDriveFolderId` no existe o está vacío en Firestore  
**Solución:** Agrega el ID siguiendo los pasos anteriores

### Error: "OneDrive folder not found"
**Causa:** El ID de carpeta no es válido o la carpeta fue eliminada  
**Solución:** Verifica que la carpeta existe en OneDrive y que el ID es correcto

### Error: "Access denied to OneDrive folder"
**Causa:** La aplicación de Azure AD no tiene permisos suficientes  
**Solución:** Verifica que los permisos `Files.Read.All` están configurados y aprobados

---

**¡Listo!** Ahora puedes obtener y configurar los Folder IDs para tus clientes fácilmente. 🎉
