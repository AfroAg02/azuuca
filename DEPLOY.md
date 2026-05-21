# Guía de Despliegue - Azuuca

## Requisitos Previos

- Node.js 18+ instalado
- npm o yarn

---

## Instalación Local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear la base de datos SQLite
npx prisma db push

# 3. Crear el usuario administrador
npm run db:seed

# 4. Iniciar servidor de desarrollo
npm run dev
```

Abrir **http://localhost:3000**

**Credenciales por defecto:**

- Email: `admin@azuuca.com`
- Contraseña: `admin123`

---

## Generar Iconos PWA

Para que la app sea instalable en móviles, necesitas iconos PNG. Colócalos en:

```
public/icons/icon-192x192.png
public/icons/icon-512x512.png
```

Puedes generarlos gratis en: https://realfavicongenerator.net/

---

## Opción 1: Despliegue en Render (100% Gratuito)

### Paso 1: Subir código a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/azuuca.git
git push -u origin main
```

### Paso 2: Crear cuenta en Render

1. Ir a https://render.com
2. Crear cuenta gratuita con GitHub

### Paso 3: Crear Base de Datos PostgreSQL

1. En el Dashboard de Render, click **"New"** → **"PostgreSQL"**
2. Nombre: `azuuca-db`
3. Plan: **Free**
4. Esperar a que se cree y copiar la **"Internal Database URL"**

### Paso 4: Modificar Prisma para PostgreSQL

En `prisma/schema.prisma`, cambiar el provider:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Hacer commit y push de este cambio.

### Paso 5: Crear Web Service

1. Click **"New"** → **"Web Service"**
2. Conectar el repositorio de GitHub
3. Configurar:
   - **Name:** `azuuca`
   - **Runtime:** Node
   - **Build Command:** `npm install && npx prisma generate && npx prisma db push && npm run build`
   - **Start Command:** `npm start`
4. Agregar Variables de Entorno:
   - `DATABASE_URL` → (la URL del PostgreSQL del paso 3)
   - `NEXTAUTH_SECRET` → (generar con: `openssl rand -base64 32`)
   - `NEXTAUTH_URL` → `https://azuuca.onrender.com`

### Paso 6: Ejecutar Seed

En la pestaña **"Shell"** del servicio en Render:

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

---

## Opción 2: Despliegue en Vercel + Neon (Gratuito)

### Paso 1: Crear Base de Datos en Neon

1. Ir a https://neon.tech
2. Crear cuenta gratuita
3. Crear un proyecto nuevo
4. Copiar el **connection string**

### Paso 2: Modificar Prisma para PostgreSQL

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Paso 3: Desplegar en Vercel

1. Ir a https://vercel.com
2. Importar proyecto desde GitHub
3. En **Environment Variables** agregar:
   - `DATABASE_URL` → (connection string de Neon)
   - `NEXTAUTH_SECRET` → (generar un secreto aleatorio)
   - `NEXTAUTH_URL` → `https://tu-proyecto.vercel.app`
4. Click **Deploy**

### Paso 4: Inicializar la Base de Datos

Desde tu máquina local, con las variables de entorno de producción:

```bash
DATABASE_URL="tu-connection-string-de-neon" npx prisma db push
DATABASE_URL="tu-connection-string-de-neon" npm run db:seed
```

---

## Opción 3: Despliegue en Railway

### Paso 1: Crear cuenta

1. Ir a https://railway.app
2. Crear cuenta (incluye $5 de crédito gratuito mensual)

### Paso 2: Crear proyecto

1. **New Project** → **Deploy from GitHub repo**
2. Seleccionar el repositorio
3. Railway detecta automáticamente que es un proyecto Node.js

### Paso 3: Agregar PostgreSQL

1. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway configura automáticamente `DATABASE_URL`

### Paso 4: Configurar

Agregar las variables de entorno:

- `NEXTAUTH_SECRET` → (generar secreto)
- `NEXTAUTH_URL` → `https://tu-app.up.railway.app`

Configurar comandos:

- **Build:** `npm install && npx prisma generate && npx prisma db push && npm run build`
- **Start:** `npm start`

---

## Instalar como App en el Móvil (PWA)

### Android (Chrome)

1. Abre la URL de la aplicación en Chrome
2. Toca el menú (**⋮**) en la esquina superior derecha
3. Selecciona **"Instalar app"** o **"Agregar a pantalla de inicio"**
4. Confirma la instalación
5. La app aparecerá como un ícono en tu pantalla de inicio

### iOS (Safari)

1. Abre la URL de la aplicación en **Safari**
2. Toca el botón de compartir (**↑**)
3. Selecciona **"Agregar a pantalla de inicio"**
4. Escribe un nombre y confirma
5. La app aparecerá como un ícono en tu pantalla de inicio

---

## Notas Importantes

- **Cambiar contraseña**: Después del primer login, cambia la contraseña del administrador en la sección "Perfil"
- **NEXTAUTH_SECRET**: Nunca uses el valor por defecto en producción. Genera uno seguro con `openssl rand -base64 32`
- **Base de datos**: En producción, usa PostgreSQL (cambia el provider en `schema.prisma`)
- **Backup**: Configura backups regulares de tu base de datos en producción
