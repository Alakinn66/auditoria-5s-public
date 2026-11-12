# Auditoría 5S — App web pública (Danfoss - HEX, Mejora Continua)

App web para auditar áreas de producción con los 20 criterios 5S, fotos de
evidencia y resultados **compartidos**: cualquiera con el enlace (y el PIN)
puede entrar sin iniciar sesión, y todos ven el mismo historial.

- **Front:** Vite + React (una sola página).
- **Datos:** Supabase (Postgres + Storage). Tablas `audits`, `audit_items`,
  `audit_photos` y bucket público `evidencias`.
- **Despliegue:** Vercel (plan gratuito).
- **Acceso:** pantalla de PIN. Hay dos códigos, definidos con variables
  de entorno (sin PIN en el código): `VITE_APP_PIN` es el PIN general, que
  entra a Consultar resultados; `VITE_AUDITOR_PIN` es el PIN de auditor,
  que entra directo a la vista Auditor. Si no se configura el PIN de
  auditor, tras el PIN general la app pregunta qué vista quieres usar.

> **Límites honestos:** los PIN son una protección ligera, no seguridad
> real: cualquiera con el enlace y el PIN general puede consultar todo, y
> cualquiera con el PIN de auditor puede ver, enviar auditorías y borrar.
> Para privacidad real habría que usar Supabase Auth (usuarios con
> contraseña).
> Los archivos viven en Supabase Storage; el plan gratuito de Supabase tiene
> 500 MB de base de datos y 1 GB de almacenamiento. Las fotos se comprimen a
> un máximo de 1024 px para cuidar ese espacio.

## Qué trae la app

- **Dos vistas tras el PIN:** el código que pongas al entrar decide la
  vista, sin pantalla de selección. **Auditor** (con el PIN de auditor):
  acceso completo para generar y capturar nuevas auditorías, retomar
  borradores, historial, gráficas y descargas. **Consultar resultados**
  (con el PIN general, para supervisores): solo consulta — historial,
  gráficas y descargas de Excel/PDF; no muestra el botón de nueva
  auditoría ni permite eliminar. Con el PIN de auditor configurado, para
  cambiar de vista hay que salir y volver a poner el PIN. Si no se
  configura el PIN de auditor, tras el PIN general la app pregunta qué
  vista quieres usar y se puede cambiar con el botón "Cambiar de vista".
- **Inicio:** total de auditorías, promedio general, auditorías por área,
  botones Nueva Auditoría / Historial y la sección LAS 5 S.
- **Datos:** selector de Subárea (el Área general se llena sola), Auditor y
  Supervisor (10 supervisores en catálogo).
- **Cuestionario:** un criterio a la vez, calificación 0–5 con la guía de
  hallazgos en gris bajo cada botón (0 "+5 de hallazgos", 1 "3 o 4 hallazgos",
  2 "1 o 2 hallazgos", 3 "0 hallazgos", 4 "Sostenido +1 mes", 5 "Sostenido
  +3 meses"), leyenda "0 - Deficiente / 5 - Excelente", comentario y hasta
  3 fotos por criterio (cámara o archivo). El borrador se guarda y se puede
  retomar.
- **Resumen:** promedio general (X.XX/5), puntos (máx. 100) y promedios 1S–5S.
- **Historial:** filtro por área general y descarga de Excel (CSV con BOM
  UTF-8, para que los acentos se vean bien en Excel).
- **Gráficas de resultados:** una sola comparativa entre subáreas en
  gráficas de barras simplificadas (nombre de la subárea, promedio y
  cantidad de auditorías), de mejor a peor, con filtros por área, por mes
  y por semana.
- **Detalle:** panel de calificación, promedios por fase, comentarios, fotos,
  Descargar PDF y Eliminar.

El pie de todas las pantallas dice: DANFOSS - HEX / MEJORA CONTINUA /
Versión: 1.0 - Actualizado Nov 2026.

## Despliegue paso a paso

### 1) Crear el proyecto en Supabase (gratis)

1. Entra a https://supabase.com y crea una cuenta (con tu correo personal o
   de Google; no necesitas la cuenta de Danfoss).
2. **New project**: nombre `auditoria-5s`, ponle una contraseña a la base de
   datos y guárdala; región: la más cercana (p. ej. US East).
3. Espera a que el proyecto se cree (1–2 minutos).

### 2) Crear las tablas (SQL Editor)

1. En el menú de Supabase abre **SQL Editor > New query**.
2. Copia todo el contenido de `supabase/schema.sql` y pégalo en el editor.
3. Pulsa **Run**. Debe decir que se ejecutó sin errores.
4. Esto crea las tablas `audits`, `audit_items`, `audit_photos`, activa RLS
   con políticas públicas y crea el bucket público `evidencias`.

### 3) Verificar el bucket de fotos

En **Storage** debe aparecer el bucket `evidencias` marcado como **Public**.
Si no aparece, créalo a mano: **New bucket**, nombre `evidencias`, activa
**Public bucket**.

### 4) Copiar las claves de la API

En **Settings > API** copia:

- **Project URL** → será `VITE_SUPABASE_URL`
- **anon public** (clave pública) → será `VITE_SUPABASE_ANON_KEY`

La clave `anon` es pública por diseño: solo puede hacer lo que las políticas
RLS permiten (ver, insertar y borrar auditorías). Nunca uses la clave
`service_role` en esta app.

### 5) Subir el código a GitHub (gratis)

1. Crea una cuenta en https://github.com si no tienes.
2. **New repository**: nombre `auditoria-5s-public`, en **Private** o
   **Public** (como prefieras; el código no contiene claves).
3. Sube el contenido de esta carpeta (sin `node_modules` ni `.env`):
   - Desde la terminal, dentro de esta carpeta:
     ```
     git init
     git add .
     git commit -m "Auditoría 5S pública v1.0"
     git branch -M main
     git remote add origin https://github.com/TU-USUARIO/auditoria-5s-public.git
     git push -u origin main
     ```
   - O desde la web de GitHub: **uploading an existing file**, arrastra los
     archivos y carpetas.

### 6) Importar el repositorio en Vercel (gratis)

1. Entra a https://vercel.com y crea una cuenta (puedes entrar con GitHub).
2. **Add New > Project > Import** el repositorio `auditoria-5s-public`.
3. Deja los valores por defecto (Framework: Vite). Antes de desplegar, en
   **Environment Variables** agrega las variables:
   - `VITE_SUPABASE_URL` = la URL de tu proyecto Supabase
   - `VITE_SUPABASE_ANON_KEY` = la clave anon
   - `VITE_APP_PIN` = el código general, p. ej. `2512` (4–6 dígitos; es el
     que compartirás con los supervisores y entra a Consultar resultados)
   - `VITE_AUDITOR_PIN` = el código de auditor, p. ej. `8741` (distinto al
     general; solo para ti y tu practicante, entra directo a la vista
     Auditor)
4. Pulsa **Deploy**. En 1–2 minutos te dará el enlace, algo como
   `https://auditoria-5s-public.vercel.app`.
5. Abre el enlace en tu celular: debe pedirte el PIN y luego mostrar el
   inicio de la app.

### 7) Probar el flujo completo

1. Entra con el PIN y crea una auditoría de prueba (cualquier subárea).
2. Califica algunos criterios, agrega una foto y guárdala.
3. Ábrela desde **otro dispositivo o navegador** (p. ej. el celular de tu
   practicante): la auditoría debe aparecer en el Historial. Si aparece, los
   datos ya son compartidos.
4. Prueba **Descargar Excel** y **Descargar PDF** en el detalle.
5. Si todo funciona, borra la auditoría de prueba con el botón Eliminar.

### 8) Cambiar los PIN

En Vercel: **Project > Settings > Environment Variables**, cambia
`VITE_APP_PIN` (general, consulta) o `VITE_AUDITOR_PIN` (auditor) y luego
**Deployments > Redeploy**. El PIN nuevo aplica desde ese despliegue. El
PIN viejo deja de funcionar.

## Cómo lo usan

- **El practicante (audita):** abre el enlace en su celular, escribe el PIN
  de auditor, **Nueva Auditoría**, elige Subárea, escribe su nombre, elige Supervisor,
  califica los 20 criterios con comentarios y fotos, revisa el Resumen y
  guarda.
- **Los supervisores (consultan):** abren el mismo enlace con el PIN
  general, que los lleva directo a **Consultar resultados**, y van a
  **Historial**: ven todas las auditorías, filtran por área, abren el detalle
  y descargan el PDF o el Excel. No pueden crear ni eliminar auditorías.
- **Tú (administras):** en Vercel ves los despliegues y cambias el PIN; en
  Supabase (Table Editor) ves y respaldas los datos. Para un respaldo rápido:
  en Supabase, **Table Editor > audits > … > Export to CSV**.

## Cómo editar los catálogos

Las áreas, subáreas, supervisores y los 20 criterios viven en
`src/data/catalog.js`. Para cambiarlos:

1. Edita ese archivo (los textos están tal cual, con acentos).
2. Haz commit y push a GitHub; Vercel despliega solo el cambio.
3. Las auditorías ya guardadas no cambian: guardan el texto que tenían.

## Estructura del proyecto

```
auditoria-5s-public/
├── index.html                  # Título y punto de entrada
├── package.json                # React, Vite, Supabase, jsPDF
├── vite.config.js
├── .env.example                # Variables que hay que configurar
├── supabase/
│   └── schema.sql              # Tablas, RLS y bucket "evidencias"
└── src/
    ├── main.jsx
    ├── index.css               # Estilos (limpio, botones rojo/negro)
    ├── App.jsx                 # Pantallas: PIN, Inicio, Datos, Preguntas,
    │                           #   Resumen, Historial, Detalle
    ├── supabaseClient.js       # Cliente Supabase + PIN + modo local
    ├── data/catalog.js         # Áreas/subáreas, supervisores, 20 criterios
    └── lib/store.js            # Guardar/cargar/borrar, CSV con BOM, PDF
```

## Modo local (sin Supabase)

Si las variables de Supabase no están configuradas, la app muestra un aviso
"Modo local" y guarda las auditorías solo en el navegador (localStorage).
Sirve para probar la interfaz, pero los datos **no** se comparten. Configura
Supabase y redespliega para el uso real.

## Desarrollo en tu computadora

```
npm install
npm run dev      # abre http://localhost:5173
npm run build    # verifica que el proyecto compila
```

Copia `.env.example` como `.env` y llena los valores para probar con tu
Supabase real.
