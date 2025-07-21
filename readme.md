# Gestor de Inventario de Alimentos

Un sistema de escritorio multiplataforma para la gestión de inventario de alimentos, diseñado para colegios y bodegas, con soporte para escáner de código de barras, reportes y control de stock multi-entidad.


---
## Tabla de Contenidos

- [Sobre el Proyecto](#sobre-el-proyecto)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Funcionalidades Clave](#funcionalidades-clave)
- [Primeros Pasos](#primeros-pasos)
  - [Prerrequisitos](#prerrequisitos)
  - [Instalación](#instalación)
- [Uso](#uso)
- [Compilación y Despliegue](#compilación-y-despliegue)
- [Estructura del Proyecto](#estructura-del-proyecto)

---
## Sobre el Proyecto

Este proyecto nació de la necesidad de un sistema robusto, moderno y fácil de usar para controlar el inventario de alimentos en múltiples bodegas. La aplicación está diseñada con un enfoque en la velocidad y la eficiencia, optimizada para el uso con escáneres de código de barras.

---
## Tecnologías Utilizadas

* **Framework de Escritorio:** [Electron](https://www.electronjs.org/)
* **Frontend:** [Angular](https://angular.io/)
* **Backend:** [Node.js](https://nodejs.org/) con [Express](https://expressjs.com/)
* **Base de Datos:** [MySQL](https://www.mysql.com/) (remota)
* **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
* **Empaquetado y Actualizaciones:** [electron-builder](https://www.electron.build/) y [electron-updater](https://www.electron.build/auto-update)

---
## Funcionalidades Clave

* ✅ **Autenticación Segura:** Sistema de login con tokens JWT y roles (Admin/Operador).
* ✅ **Multi-Bodega:** El inventario está segregado por entidad (colegio), pero visible globalmente para administradores.
* ✅ **Gestión de Catálogos:** CRUDs completos para Productos y Proveedores.
* ✅ **Control de Inventario:** Registro de recepciones y salidas, con validación para prevenir stock negativo.
* ✅ **Optimización para Escáner:** Flujos de trabajo rápidos para el ingreso de datos con código de barras.
* ✅ **Dashboard Inteligente:** Alertas de stock bajo en tiempo real, agrupadas por bodega.
* ✅ **Reportes:** Generación y descarga de informes de movimientos y recepciones en formato CSV.
* ✅ **Actualizaciones Automáticas:** La aplicación busca y se actualiza a la última versión automáticamente.

---
## Primeros Pasos

Sigue estos pasos para poner en marcha una copia del proyecto en tu máquina local.

### Prerrequisitos

* **Node.js:** v20.x o superior. [Descargar aquí](https://nodejs.org/).
* **Git:** Para clonar el repositorio.
* **Una base de datos MySQL** accesible remotamente.

### Instalación

1.  **Clona el repositorio:**
    ```sh
    git clone [https://github.com/KevCristensen/gestor-inventario-app.git](https://github.com/KevCristensen/gestor-inventario-app.git)
    ```
2.  **Navega al directorio del proyecto:**
    ```sh
    cd gestor-inventario-app
    ```
3.  **Crea tu archivo de credenciales:**
    Copia `.env.example` a un nuevo archivo llamado `.env` y rellénalo con los datos de tu base de datos.
    ```sh
    cp .env.example .env
    ```
4.  **Instala las dependencias del backend:**
    ```sh
    npm install
    ```
5.  **Instala las dependencias del frontend:**
    ```sh
    cd angular-app
    npm install
    ```

---
## Uso

Para ejecutar la aplicación en modo de desarrollo (con recarga automática):

1.  Asegúrate de estar en la carpeta **raíz** del proyecto.
2.  Ejecuta el comando:
    ```sh
    npm start
    ```

---
## Compilación y Despliegue

Para empaquetar la aplicación en un instalador (`.exe` o `.dmg`) y publicarla en GitHub Releases:

1.  Asegúrate de que las credenciales de publicación en `package.json` sean correctas.
2.  Configura tu token de GitHub en la terminal:
    * **Mac/Linux:** `export GH_TOKEN="tu_token"`
    * **Windows (PowerShell):** `$env:GH_TOKEN="tu_token"`
3.  Ejecuta el script de publicación:
    ```sh
    npm run publish
    ```

---
## Estructura del Proyecto
```
.
├── angular-app/     # Código fuente del frontend (Angular)
├── backend/         # Lógica del backend (Rutas, Middlewares)
├── release/         # Carpeta de salida de los instaladores
├── main.js          # Punto de entrada de Electron y del servidor
├── preload.js       # Script de puente entre Electron y Angular
└── package.json     # Configuración y dependencias del proyecto
```