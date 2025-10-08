# 🎯 Pasos Finales para Activar OneDrive Personal

## ✅ Lo que ya está listo (Yo lo hice):

1. ✅ Código de autenticación delegada
2. ✅ Endpoints de login y callback
3. ✅ Sistema de renovación automática de tokens
4. ✅ Página actualizada con botón de login
5. ✅ Variable `AZURE_REDIRECT_URI` agregada a `.env.local`

---

## 📋 Lo que DEBES hacer TÚ (5 minutos):

### **Paso 1: Configurar Azure AD**

Lee y sigue el archivo: **`CONFIGURAR_AZURE_DELEGATED.md`**

Básicamente:
1. Ve a Azure Portal
2. Agrega Redirect URIs
3. Agrega permisos Delegated
4. Grant admin consent
5. Verifica que soporte cuentas personales

**⏱️ Tiempo: 5 minutos**

---

### **Paso 2: Reiniciar el Servidor**

```bash
# Detén el servidor (Ctrl+C)
npm run dev
```

---

### **Paso 3: Iniciar Sesión**

1. Ve a: `http://localhost:3000/dashboard/onedrive-setup`

2. Haz clic en: **"🚀 Iniciar Sesión con Microsoft"**

3. Se abrirá una ventana de Microsoft:
   - Inicia sesión con `optingsrl@gmail.com`
   - Acepta los permisos que pide la app
   - Serás redirigido de vuelta a la app

4. Verás un mensaje: **"¡Autenticación Exitosa!"**

---

### **Paso 4: Listar Carpetas**

Ahora puedes:
- Hacer clic en "Listar Carpetas"
- Buscar carpetas por nombre
- Copiar los IDs de carpetas

**¡Todo funcionará con tu OneDrive personal!** 🎉

---

## 🔄 ¿Qué Pasa Después del Login?

1. **La aplicación guarda un refresh token** en Firestore (`config/onedrive_tokens`)
2. **El token se renueva automáticamente** cada hora
3. **No necesitas volver a iniciar sesión** (el token dura meses/años)
4. **Tus clientes NO necesitan iniciar sesión**, todo es transparente

---

## 🆘 Si Algo Sale Mal

### Error: "redirect_uri_mismatch"
**Causa:** No agregaste el Redirect URI en Azure AD

**Solución:**
1. Azure AD → App → Authentication
2. Agrega: `http://localhost:3000/api/auth/callback`
3. Intenta de nuevo

---

### Error: "invalid_scope"
**Causa:** No agregaste los permisos Delegated

**Solución:**
1. Azure AD → App → API permissions
2. Agrega permisos **Delegated** (no Application)
3. Grant admin consent

---

### Error: "AADSTS50020: User account is not valid"
**Causa:** La app no soporta cuentas personales

**Solución:**
1. Azure AD → App → Authentication
2. Supported account types → Selecciona "Personal Microsoft accounts"
3. Save

---

## 📖 Documentación Completa

- **`CONFIGURAR_AZURE_DELEGATED.md`** ← Lee esto primero
- **`SOLUCION_ONEDRIVE_PERSONAL.md`** ← Explicación del problema
- **`COMO_OBTENER_FOLDER_ID.md`** ← Cómo usar después

---

## 🎉 ¿Todo Listo?

**Checklist:**
- [ ] Configuraste Azure AD (redirect URI + permisos delegated)
- [ ] Reiniciaste el servidor
- [ ] Hiciste clic en "Iniciar Sesión con Microsoft"
- [ ] Viste el mensaje "¡Autenticación Exitosa!"
- [ ] Puedes listar carpetas sin error 404

**Si completaste todo, ¡FELICIDADES! Ya tienes OneDrive funcionando** 🚀

---

**Tiempo total estimado: 10 minutos**
