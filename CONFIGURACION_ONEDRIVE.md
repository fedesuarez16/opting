# ⚠️ Configuración Importante para OneDrive

## Error 500 - Solución

Si recibes un error 500 al intentar listar las carpetas de OneDrive, necesitas agregar una variable de entorno adicional.

### 🔧 Problema

Cuando usas **client credentials** (autenticación de servidor a servidor), Microsoft Graph **NO** puede usar el endpoint `/me/` porque no hay un usuario autenticado. Necesitas especificar explícitamente qué usuario de OneDrive quieres acceder.

### ✅ Solución

Agrega esta variable a tu archivo `.env.local`:

```env
# Email del usuario propietario de OneDrive
ONEDRIVE_USER_EMAIL=tu-email@tudominio.com
```

### 📝 ¿Qué email usar?

Usa el **email de la cuenta de Microsoft** que contiene las carpetas de OneDrive que quieres acceder. Por ejemplo:

- Si tus carpetas están en la cuenta `admin@empresa.com` → usa ese email
- Si usas una cuenta personal de Microsoft → usa tu email personal
- Si es una cuenta corporativa → usa el email corporativo

### 🔐 Permisos Necesarios en Azure AD

Para que esto funcione, tu aplicación de Azure AD necesita tener permisos de **Application** (no delegados):

1. Ve al [Portal de Azure](https://portal.azure.com/)
2. Azure Active Directory > App registrations > Tu aplicación
3. API permissions > Add a permission > Microsoft Graph
4. **Application permissions** (NO Delegated)
5. Agrega estos permisos:
   - `Files.Read.All` - Para leer archivos
   - `Sites.Read.All` - Para acceder a SharePoint/OneDrive (opcional pero recomendado)
6. **¡IMPORTANTE!** Haz clic en "Grant admin consent" para aprobar los permisos

### 📋 Configuración Completa en `.env.local`

```env
# Firebase Client (Browser)
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://tu-proyecto.firebaseio.com/
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin (Server)
FIREBASE_ADMIN_PROJECT_ID=tu-proyecto-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@tu-proyecto.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTuClavePrivada\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_DATABASE_URL=https://tu-proyecto.firebaseio.com/

# Microsoft Graph / OneDrive Integration
AZURE_TENANT_ID=tu-tenant-id
AZURE_CLIENT_ID=tu-client-id  
AZURE_CLIENT_SECRET=tu-client-secret
ONEDRIVE_USER_EMAIL=tu-email@tudominio.com  # ← ¡NUEVA VARIABLE!
```

### 🧪 Verificar que Funciona

Después de agregar la variable:

1. **Reinicia el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

2. **Prueba el endpoint:**
   ```
   http://localhost:3000/api/onedrive/helpers?action=list-root-folders
   ```

3. **Deberías ver algo como:**
   ```json
   {
     "success": true,
     "folders": [
       {
         "id": "01ABCDEF...",
         "name": "Clientes",
         "childCount": 5,
         "webUrl": "https://..."
       }
     ]
   }
   ```

### 🔄 Alternativa: Pasar el userId por parámetro

Si no quieres usar una variable de entorno, puedes pasar el email como parámetro:

```
/api/onedrive/helpers?action=list-root-folders&userId=tu-email@tudominio.com
```

Pero es **más seguro** usar la variable de entorno.

### 🆘 Troubleshooting

#### Error: "OneDrive user email is required"
**Causa:** No has agregado `ONEDRIVE_USER_EMAIL` a `.env.local`  
**Solución:** Agrega la variable y reinicia el servidor

#### Error: "Access denied" o 403
**Causa:** Los permisos de aplicación no están configurados correctamente  
**Solución:** 
1. Verifica que tienes permisos de **Application** (no Delegated)
2. Asegúrate de haber dado "Grant admin consent"
3. Espera unos minutos para que los cambios se propaguen

#### Error: "Invalid user" o 404
**Causa:** El email no es válido o el usuario no existe en tu tenant  
**Solución:** Verifica que el email sea correcto y esté en el mismo tenant de Azure AD

#### Error: "Token acquisition failed"
**Causa:** Las credenciales de Azure están mal configuradas  
**Solución:** Revisa `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, y `AZURE_CLIENT_SECRET`

### 📚 Más Información

- [Microsoft Graph API - Acceder a OneDrive de otros usuarios](https://learn.microsoft.com/en-us/graph/api/resources/onedrive)
- [Client Credentials Flow](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow)
- [Permisos de Application vs Delegated](https://learn.microsoft.com/en-us/graph/permissions-reference)

---

**¡Ahora debería funcionar!** 🎉
