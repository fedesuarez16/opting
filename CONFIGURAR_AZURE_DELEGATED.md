# ⚙️ Configuración de Azure AD para Autenticación Delegada

## 🎯 Pasos a Seguir

### 1️⃣ **Ve al Portal de Azure**

Abre: https://portal.azure.com

**Azure Active Directory** → **App registrations** → **Tu aplicación**

---

### 2️⃣ **Configurar Authentication (Autenticación)**

1. En el menú izquierdo, haz clic en **"Authentication"**

2. Click en **"+ Add a platform"**

3. Selecciona **"Web"**

4. En **Redirect URIs**, agrega estas dos URLs:
   ```
   http://localhost:3000/api/auth/callback
   http://localhost:3001/api/auth/callback
   ```
   (Usamos ambos puertos por si acaso)

5. En **"Front-channel logout URL"** deja vacío

6. En **"Implicit grant and hybrid flows"**, NO marques nada

7. Click **"Configure"**

---

### 3️⃣ **Configurar API Permissions (Permisos)**

1. En el menú izquierdo, haz clic en **"API permissions"**

2. Verás los permisos actuales de **Application permissions**

3. **IMPORTANTE:** Vamos a agregar permisos **Delegated** (sin eliminar los Application):

   a. Click en **"+ Add a permission"**
   
   b. Selecciona **"Microsoft Graph"**
   
   c. **¡IMPORTANTE!** Selecciona **"Delegated permissions"** (NO Application)
   
   d. Busca y marca estos permisos:
      - ✅ `Files.Read.All`
      - ✅ `Files.ReadWrite.All` (si quieres también poder escribir)
      - ✅ `offline_access` (para refresh tokens)
      - ✅ `User.Read` (para info del usuario)
   
   e. Click **"Add permissions"**

4. Click en **"Grant admin consent for [tu organización]"**

5. Confirma haciendo click en **"Yes"**

6. **Verifica:** Debes tener algo como esto:

```
Microsoft Graph - Delegated permissions:
├─ Files.Read.All          ✅ Granted for...
├─ Files.ReadWrite.All     ✅ Granted for...
├─ offline_access          ✅ Granted for...
└─ User.Read               ✅ Granted for...

Microsoft Graph - Application permissions:
├─ Files.Read.All          ✅ Granted for...
├─ Sites.Read.All          ✅ Granted for...
└─ User.Read.All           ✅ Granted for...
```

---

### 4️⃣ **Verificar Overview**

1. Ve a **"Overview"** en el menú izquierdo

2. **Confirma estos valores** (ya los tienes pero verifiquemos):
   - **Application (client) ID**: `b4679d3b-...`
   - **Directory (tenant) ID**: `94bf49a2-...`

---

### 5️⃣ **Tipo de Cuenta Soportada**

1. En **"Overview"**, verifica **"Supported account types"**

2. Debería decir:
   - **"Accounts in any organizational directory and personal Microsoft accounts"**
   - O al menos: **"Personal Microsoft accounts only"**

3. Si NO dice eso:
   - Ve a **"Authentication"**
   - En **"Supported account types"**
   - Selecciona: **"Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"**
   - Click **"Save"**

---

## ✅ Checklist Final

Antes de continuar, verifica que:

- [ ] Agregaste Redirect URI: `http://localhost:3000/api/auth/callback`
- [ ] Agregaste Redirect URI: `http://localhost:3001/api/auth/callback`
- [ ] Agregaste permisos **Delegated** (Files.Read.All, Files.ReadWrite.All, offline_access, User.Read)
- [ ] Hiciste click en "Grant admin consent"
- [ ] Todos los permisos tienen ✅ verde
- [ ] El tipo de cuenta soporta "Personal Microsoft accounts"

---

## 🚀 Siguiente Paso

Una vez que hayas completado esto, avísame y continuamos con el código.

**Tiempo estimado:** 5 minutos ⏱️
