# 🎯 Crear App Registration para Cuentas Personales

## Paso 1: Ir al Portal de Azure

1. **Abre:** https://portal.azure.com

2. **Navega a:**
   - **Azure Active Directory** (o busca "Azure Active Directory" en la barra de búsqueda)
   - En el menú izquierdo, click en **"App registrations"**
   - Click en **"+ New registration"** (arriba)

---

## Paso 2: Configurar la Nueva Aplicación

### **Name (Nombre):**
```
Opting OneDrive Personal
```

### **Supported account types (IMPORTANTE):**

Selecciona la **TERCERA OPCIÓN**:

```
✅ Accounts in any organizational directory (Any Azure AD directory - Multitenant) 
   and personal Microsoft accounts (e.g. Skype, Xbox)
```

**⚠️ ASEGÚRATE de que dice "and personal Microsoft accounts"**

### **Redirect URI:**

Por ahora déjalo **vacío** (lo configuramos después)

### **Click en "Register"**

---

## Paso 3: Copiar Credenciales

Después de crear la app, estarás en la página **Overview**.

### **Copia estos valores:**

1. **Application (client) ID**
   - Ejemplo: `a1b2c3d4-5678-90ab-cdef-1234567890ab`
   - Lo necesitas para `AZURE_CLIENT_ID`

2. **Directory (tenant) ID**
   - Ejemplo: `94bf49a2-832b-4b16-93c4-3f5c51345cf9`
   - Pero vamos a usar `common` en su lugar

**Anota estos valores en un lugar seguro.**

---

## Paso 4: Crear Client Secret

1. En el menú izquierdo, click en **"Certificates & secrets"**

2. En la pestaña **"Client secrets"**, click en **"+ New client secret"**

3. **Description:** `OneDrive Integration Secret`

4. **Expires:** Selecciona **"24 months"** (o el máximo disponible)

5. Click **"Add"**

6. **⚠️ INMEDIATAMENTE copia el VALUE** (la columna "Value", NO "Secret ID")
   - Se ve algo así: `Abc~123DEF456-ghi_789JKL`
   - **Solo podrás verlo UNA VEZ**
   - Lo necesitas para `AZURE_CLIENT_SECRET`

---

## Paso 5: Configurar Redirect URIs

1. En el menú izquierdo, click en **"Authentication"**

2. Click en **"+ Add a platform"**

3. Selecciona **"Web"**

4. En **"Redirect URIs"**, agrega estas dos URLs:
   ```
   http://localhost:3000/api/auth/callback
   http://localhost:3001/api/auth/callback
   ```

5. **NO marques** ninguna casilla en "Implicit grant and hybrid flows"

6. Click **"Configure"**

---

## Paso 6: Configurar Permisos

1. En el menú izquierdo, click en **"API permissions"**

2. Click en **"+ Add a permission"**

3. Selecciona **"Microsoft Graph"**

4. **¡IMPORTANTE!** Selecciona **"Delegated permissions"** (NO Application)

5. Busca y marca estos permisos:
   - ✅ `Files.Read.All`
   - ✅ `Files.ReadWrite.All`
   - ✅ `offline_access`
   - ✅ `User.Read`

6. Click **"Add permissions"**

7. **OPCIONAL (pero recomendado):** Click en **"Grant admin consent for [tu organización]"**
   - Si no tienes permisos de admin, no te preocupes, funcionará igual

---

## Paso 7: Verificar Configuración

### En la página **Overview**, verifica:

```
Display name: Opting OneDrive Personal
Application (client) ID: [tu-nuevo-client-id]
Directory (tenant) ID: [tu-tenant-id]
Supported account types: Multitenant and personal accounts ✅
```

### En **Authentication**, verifica:

```
Platform configurations:
  Web
    Redirect URIs:
      - http://localhost:3000/api/auth/callback ✅
      - http://localhost:3001/api/auth/callback ✅
```

### En **API permissions**, verifica:

```
Microsoft Graph - Delegated permissions:
  ├─ Files.Read.All ✅
  ├─ Files.ReadWrite.All ✅
  ├─ offline_access ✅
  └─ User.Read ✅
```

---

## ✅ Checklist Final

Antes de continuar, asegúrate de que:

- [ ] Creaste la app con "Multitenant and personal accounts"
- [ ] Copiaste el Application (client) ID
- [ ] Creaste y copiaste el Client Secret (Value, no Secret ID)
- [ ] Agregaste los dos Redirect URIs
- [ ] Agregaste los 4 permisos Delegated
- [ ] (Opcional) Diste Grant admin consent

---

## 🚀 Siguiente Paso

Una vez que hayas completado todo esto, avísame y te ayudo a actualizar el `.env.local` con las nuevas credenciales.

**Tiempo estimado:** 5-7 minutos ⏱️
