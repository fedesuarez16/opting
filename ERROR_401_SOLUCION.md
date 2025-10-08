# 🔴 Error 401: Unauthorized - Solución

## ❌ Error que estás viendo:

```
Error getting access token: Error [AxiosError]: Request failed with status code 401
Error: Failed to obtain access token from Microsoft Graph
```

## 🔍 ¿Qué significa?

El error 401 significa que **Microsoft está rechazando tus credenciales**. Esto puede deberse a:

1. ❌ Credenciales incorrectas (Tenant ID, Client ID, o Client Secret)
2. ❌ Client Secret expirado
3. ❌ Falta de permisos en Azure AD
4. ❌ Variables de entorno mal configuradas

---

## ✅ Solución Paso a Paso

### 🎯 PASO 1: Página de Diagnóstico (NUEVO)

He creado una página especial para diagnosticar el problema:

```
http://localhost:3001/dashboard/onedrive-diagnostics
```

**Haz esto primero:**
1. Ve a esa URL
2. Haz clic en "Ejecutar Diagnóstico"
3. Te dirá exactamente qué está mal y cómo solucionarlo

---

### 🔧 PASO 2: Verificar Configuración de Azure AD

#### A. Obtener las credenciales correctas

1. **Ve al Portal de Azure:**
   ```
   https://portal.azure.com
   ```

2. **Navega a:**
   ```
   Azure Active Directory 
   → App registrations 
   → [Tu aplicación]
   ```

3. **En la página Overview, copia:**
   - **Application (client) ID** → Este es tu `AZURE_CLIENT_ID`
   - **Directory (tenant) ID** → Este es tu `AZURE_TENANT_ID`

4. **Ve a "Certificates & secrets":**
   - Si tu Client Secret expiró o no funciona, crea uno nuevo:
     - Click en "+ New client secret"
     - Descripción: "OneDrive Integration"
     - Expires: 24 meses
     - Click "Add"
   - **⚠️ IMPORTANTE:** Copia el **Value** INMEDIATAMENTE (no podrás verlo después)
   - Este es tu `AZURE_CLIENT_SECRET`

#### B. Configurar Permisos (MUY IMPORTANTE)

1. **Ve a "API permissions"**

2. **Click en "+ Add a permission"**

3. **Selecciona "Microsoft Graph"**

4. **IMPORTANTE: Selecciona "Application permissions"** (NO Delegated)

5. **Busca y agrega:**
   - ✅ `Files.Read.All`
   - ✅ `Sites.Read.All` (opcional pero recomendado)

6. **⚠️ CRÍTICO: Click en "Grant admin consent for [tu organización]"**
   - Debe aparecer un ✅ verde junto a cada permiso
   - Si no aparece, NO funcionará

#### C. Verificar que los permisos fueron aprobados

En la tabla de permisos debe aparecer:

| Permission | Type | Status |
|------------|------|--------|
| Files.Read.All | Application | ✅ Granted for [organización] |
| Sites.Read.All | Application | ✅ Granted for [organización] |

---

### 📝 PASO 3: Actualizar .env.local

1. **Abre tu archivo `.env.local` en la raíz del proyecto**

2. **Actualiza estas variables con los valores correctos:**

```env
# Microsoft Graph / OneDrive Integration
AZURE_TENANT_ID=12345678-1234-1234-1234-123456789abc
AZURE_CLIENT_ID=87654321-4321-4321-4321-cba987654321
AZURE_CLIENT_SECRET=abc~def123456789_ghi-jkl
ONEDRIVE_USER_EMAIL=tu-email@tudominio.com
```

**⚠️ IMPORTANTE:**
- NO uses comillas en los valores
- NO agregues espacios extras
- Copia y pega directamente desde Azure
- El Tenant ID y Client ID son GUIDs (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
- El Client Secret es una cadena alfanumérica con caracteres especiales

---

### 🔄 PASO 4: Reiniciar el Servidor

**Esto es OBLIGATORIO después de editar .env.local**

1. Detén el servidor (Ctrl+C en la terminal)

2. Reinicia:
   ```bash
   npm run dev
   ```

3. Espera a que aparezca:
   ```
   ✓ Ready in XXXXms
   Reload env: .env.local
   ```

---

### ✅ PASO 5: Probar de Nuevo

#### Opción 1: Página de Diagnóstico (RECOMENDADO)
```
http://localhost:3001/dashboard/onedrive-diagnostics
```

Ejecuta el diagnóstico y verifica que aparezca:
```
✅ ¡Configuración Correcta!
```

#### Opción 2: Endpoint directo
```
http://localhost:3001/api/onedrive/test-auth
```

Deberías ver algo como:
```json
{
  "success": true,
  "message": "🎉 ¡Autenticación exitosa!",
  "tokenInfo": {
    "tokenType": "Bearer",
    "expiresIn": 3599
  }
}
```

---

## 🆘 Troubleshooting Específico

### Error: "invalid_client"

**Causa:** Client ID o Client Secret incorrectos

**Solución:**
1. Verifica que copiaste correctamente desde Azure
2. Asegúrate de que no hay espacios extras
3. Genera un nuevo Client Secret si es necesario
4. Reinicia el servidor

---

### Error: "unauthorized_client"

**Causa:** La aplicación no tiene los permisos correctos

**Solución:**
1. Ve a Azure AD → API permissions
2. Asegúrate de que sean permisos de **Application** (no Delegated)
3. Haz clic en "Grant admin consent"
4. Espera 5-10 minutos para que se propaguen los cambios

---

### Error: "invalid_tenant"

**Causa:** Tenant ID incorrecto

**Solución:**
1. Ve a Azure AD → Overview
2. Copia el "Tenant ID" (también llamado "Directory ID")
3. Actualiza `AZURE_TENANT_ID` en .env.local
4. Reinicia el servidor

---

### Las variables están configuradas pero sigue sin funcionar

**Posibles causas:**

1. **No reiniciaste el servidor:**
   - Debes hacer Ctrl+C y `npm run dev` de nuevo

2. **El archivo .env.local está en la ubicación incorrecta:**
   - Debe estar en `/Users/federicosuarez/opting/.env.local` (raíz del proyecto)
   - NO en `/Users/federicosuarez/opting/src/.env.local`

3. **Hay caracteres invisibles o espacios:**
   ```env
   # ❌ MAL (con comillas y espacios)
   AZURE_CLIENT_ID = "12345678-1234-1234-1234-123456789abc"
   
   # ✅ BIEN (sin comillas ni espacios)
   AZURE_CLIENT_ID=12345678-1234-1234-1234-123456789abc
   ```

4. **El Client Secret expiró:**
   - Ve a Azure AD → Certificates & secrets
   - Verifica la fecha de expiración
   - Si expiró, genera uno nuevo

---

## 📋 Checklist de Verificación

Antes de pedir ayuda, verifica que:

- [ ] Copiaste correctamente el Tenant ID desde Azure
- [ ] Copiaste correctamente el Client ID desde Azure
- [ ] Generaste un nuevo Client Secret y lo copiaste inmediatamente
- [ ] Configuraste permisos de **Application** (no Delegated)
- [ ] Hiciste clic en "Grant admin consent"
- [ ] Actualizaste `.env.local` en la raíz del proyecto
- [ ] Las variables NO tienen comillas ni espacios extras
- [ ] Reiniciaste el servidor con `npm run dev`
- [ ] Esperaste a que aparezca "Reload env: .env.local"
- [ ] Probaste la página de diagnóstico

---

## 🎯 Ejemplo de .env.local Completo

```env
# Firebase Client (Browser)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyABC123def456GHI789jkl
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mi-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://mi-proyecto-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mi-proyecto-123
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mi-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123def456

# Firebase Admin (Server)
FIREBASE_ADMIN_PROJECT_ID=mi-proyecto-123
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mi-proyecto.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...(tu clave)...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_DATABASE_URL=https://mi-proyecto-default-rtdb.firebaseio.com

# Microsoft Graph / OneDrive Integration
AZURE_TENANT_ID=12345678-90ab-cdef-1234-567890abcdef
AZURE_CLIENT_ID=abcdef12-3456-7890-abcd-ef1234567890
AZURE_CLIENT_SECRET=Abc~123DEF456-ghi_789JKL
ONEDRIVE_USER_EMAIL=admin@miempresa.com
```

---

## 📞 Si Aún No Funciona

1. **Ejecuta el diagnóstico y copia el resultado:**
   ```
   http://localhost:3001/dashboard/onedrive-diagnostics
   ```

2. **Verifica los logs del servidor** donde corrió `npm run dev`

3. **Comparte:**
   - El JSON completo del diagnóstico
   - Los logs del servidor (sin revelar secretos)
   - Capturas de Azure AD mostrando los permisos

---

**¡Con estos pasos debería funcionar!** 🚀
