# Opting - Mediciones Dashboard

Esta aplicación permite recibir datos desde Google Sheets y guardarlos en Firebase Firestore, para luego mostrarlos en un dashboard.

## Configuración

### 1. Configuración de Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilita Firestore y Authentication
3. Crea una cuenta de servicio para Firebase Admin en la sección Project Settings > Service Accounts
4. Descarga el archivo JSON de la cuenta de servicio
5. Copia el archivo `.env.local.example` a `.env.local` y completa las variables de entorno con los datos de tu proyecto Firebase

### 2. Variables de entorno

Crea un archivo `.env.local` con las siguientes variables:

```
# Firebase Client (Browser)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_DATABASE_URL=
```

### 3. Instalación y ejecución

```bash
npm install
npm run dev
```

## Conexión con Google Sheets

Para conectar Google Sheets con la aplicación, sigue estos pasos:

1. Abre tu hoja de cálculo en Google Sheets
2. Ve a Extensiones > Apps Script
3. Crea un nuevo script y pega el siguiente código:

```js
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const row = e.range.getRow();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(row, 1, 1, headers.length).getValues()[0];

  const data = {};
  headers.forEach((h, i) => {
    data[h.trim()] = values[i];
  });

  const options = {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(data),
  };

  UrlFetchApp.fetch("https://tu-dominio.vercel.app/api/sync-to-firebase", options);
}
```

4. Reemplaza `https://tu-dominio.vercel.app` con la URL de tu aplicación desplegada
5. Guarda y autoriza el script

### Estructura de la hoja de cálculo

La hoja de cálculo debe tener al menos las siguientes columnas:

- `CLIENTE`: Nombre del cliente/empresa
- `SUCURSAL`: Nombre de la sucursal
- `FECHAS DE MEDICIÓN`: Fecha en formato DD/MM/YYYY
- `TÉCNICO`: Nombre del técnico
- `SERVICIO`: Tipo de servicio

## Estructura de datos en Firestore

Los datos se almacenan en Firestore con la siguiente estructura:

```
/empresas/{CLIENTE}/sucursales/{SUCURSAL}/mediciones/{fecha-formateada}
```

Donde `fecha-formateada` se forma reemplazando las barras `/` de `FECHAS DE MEDICIÓN` por guiones `-`.

## Funcionalidades

- API para recibir datos desde Google Sheets
- Almacenamiento en Firestore con estructura jerárquica
- Dashboard para visualizar mediciones por empresa y sucursal
- Filtrado de datos por empresa y sucursal

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
