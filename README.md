# Control de Visitas

Sistema de control de visitas (registro de entrada/salida, historial, filtros, exportación CSV y reportes), publicado como **sitio estático** con GitHub Pages.

- **Demo:** `https://TU-USUARIO.github.io/visitas-salud/`
- **Usuario:** `Diego` · **Contraseña:** `12345`

## Estructura

```
visitas-salud/
├── index.html          # Login (página de inicio del sitio)
├── inicio.html         # Registrar entrada/salida
├── registros.html      # Historial, filtros y CSV
├── reportes.html       # Reportes
├── assets/
│   ├── css/styles.css
│   └── js/app.js       # Lógica (reemplaza al backend Flask)
├── flask-original/     # Versión original en Python + Flask (referencia)
└── .nojekyll           # Evita que GitHub procese el sitio con Jekyll
```

## Publicar en GitHub Pages

1. Sube todo el contenido de esta carpeta a la raíz del repositorio (rama `main`).
2. En GitHub: **Settings → Pages → Build and deployment**
   - **Source:** Deploy from a branch
   - **Branch:** `main` · carpeta **/ (root)** → **Save**
3. Espera 1–2 minutos y abre `https://TU-USUARIO.github.io/visitas-salud/`.

## Cómo funciona

GitHub Pages solo sirve archivos estáticos (no ejecuta Python), así que la lógica de `app.py` se portó a JavaScript:

- Las visitas se guardan en el **localStorage** del navegador (cada persona ve sus propios datos; arrancan con los datos de ejemplo).
- La sesión usa **sessionStorage** y se cierra al cerrar la pestaña.
- Para volver a los datos de ejemplo: DevTools → Application → Local Storage → borrar `control_visitas_v1`.

> ⚠️ El login es solo una demo en el navegador: la contraseña es visible en el código. No uses este sitio para datos reales.

## Ejecutar la versión Flask (opcional)

```
cd flask-original
pip install -r requirements.txt
python app.py        # http://127.0.0.1:5000
```
