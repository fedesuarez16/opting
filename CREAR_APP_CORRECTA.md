# 🎯 Crear App CORRECTA para Cuentas Personales

## ⚠️ Problema
Tu app actual NO soporta cuentas personales de Microsoft. Necesitas crear una nueva.

---

## 🚀 Pasos (5 minutos)

### 1. Portal de Azure
https://portal.azure.com

### 2. Nueva App Registration
- Azure Active Directory → App registrations
- Click **"+ New registration"**

### 3. Configuración CRÍTICA

**Name:**
```
Opting OneDrive Personal v2
```

**Supported account types - ¡IMPORTANTE!**

Debes ver **4 opciones**. Selecciona la **TERCERA**:

```
○ Accounts in this organizational directory only (Single tenant)

○ Accounts in any organizational directory (Multitenant)

✅ Accounts in any organizational directory (Any Azure AD directory - Multitenant) 
   and personal Microsoft accounts (e.g. Skype, Xbox)
   
○ Personal Microsoft accounts only
```

**⚠️ ASEGÚRATE de que la opción seleccionada diga "and personal Microsoft accounts"**

**Redirect URI:**
- Déjalo vacío por ahora

**Click "Register"**

---

### 4. Copiar Credenciales

En la página **Overview**:

**Application (client) ID:**
```
[Copia este valor - lo necesitas para AZURE_CLIENT_ID]
```

**Directory (tenant) ID:**
```
[Lo ves pero NO lo usarás - usarás "common"]
```

---

### 5. Crear Client Secret

1. Menú izquierdo → **"Certificates & secrets"**
2. Tab **"Client secrets"** → **"+ New client secret"**
3. Description: `OneDrive Secret`
4. Expires: **24 months**
5. Click **"Add"**
6. **⚠️ COPIA EL VALUE INMEDIATAMENTE** (solo se muestra una vez)

```
[Copia el VALUE - lo necesitas para AZURE_CLIENT_SECRET]
```

---

### 6. Configurar Redirect URIs

1. Menú izquierdo → **"Authentication"**
2. **"+ Add a platform"** → **"Web"**
3. Redirect URIs:
   ```
   http://localhost:3000/api/auth/callback
   http://localhost:3001/api/auth/callback
   ```
4. **NO marques** nada en "Implicit grant"
5. Click **"Configure"**

---

### 7. Configurar Permisos

1. Menú izquierdo → **"API permissions"**
2. **"+ Add a permission"** → **"Microsoft Graph"**
3. **"Delegated permissions"** (NO Application)
4. Marca:
   - ✅ Files.Read.All
   - ✅ Files.ReadWrite.All
   - ✅ offline_access
   - ✅ User.Read
5. Click **"Add permissions"**

---

### 8. VERIFICAR (MUY IMPORTANTE)

En la página **Overview**, debe decir:

```
Supported account types: Multitenant and personal accounts ✅
```

Si NO dice "and personal accounts", REPITE desde el paso 2.

---

## ✅ Checklist Final

- [ ] La app dice "Multitenant and personal accounts"
- [ ] Copiaste el Application (client) ID
- [ ] Copiaste el Client Secret (VALUE)
- [ ] Agregaste los 2 Redirect URIs
- [ ] Agregaste los 4 permisos Delegated

---

## 📝 Valores que necesito

Una vez completado, dame:

1. **Nuevo Application (client) ID:** `_________________`
2. **Nuevo Client Secret:** `_________________`

Y yo actualizo tu `.env.local`

---

**Tiempo: 5 minutos** ⏱️
