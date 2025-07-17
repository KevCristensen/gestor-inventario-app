// Importa las herramientas necesarias
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

// ... (tu declaración de 'declare global' sigue igual)
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => void;
      onAppVersion: (callback: (value: { version: string }) => void) => void;
    };
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HttpClientModule],
  template: `
    <h1>¡Hola desde Angular y Electron! 👋</h1>
    <h2>Versión de la aplicación: {{ version }}</h2>
    <h3>Estado de la conexión DB: {{ dbStatus }}</h3>
  `,
  styles: ['h1, h2, h3, p { text-align: center; font-family: sans-serif; }']
})
export class AppComponent implements OnInit {
  version = 'cargando...';
  dbStatus = 'probando...';

  // Inyecta PLATFORM_ID para saber en qué entorno estamos
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // ---- ESTA ES LA LÓGICA CLAVE ----
    // Solo ejecuta el código de Electron/window si estamos en un navegador
    if (isPlatformBrowser(this.platformId)) {
      
      // Pide la versión de la app
      window.electronAPI.getAppVersion();
      
      // Escucha la respuesta
      window.electronAPI.onAppVersion(({ version }) => {
        this.version = version;
      });

      // Prueba la conexión a la DB
      this.http.get<{ message: string }>('http://localhost:3000/api/test-db').subscribe({
        next: (res) => this.dbStatus = res.message,
        error: (err) => this.dbStatus = `Error: ${err.message}`
      });
    }
  }
}