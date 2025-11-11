import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, LOCALE_ID, importProvidersFrom } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor'; 
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';




// --- ¡NUEVA CONFIGURACIÓN! ---
// Apunta a tu nuevo backend de NestJS en el puerto 3001 y al namespace 'chat'.
const config: SocketIoConfig = { 
  url: 'http://localhost:3001/chat', // El namespace se añade a la URL
  options: {} 
};


// Registramos el locale español
registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(), provideClientHydration(withEventReplay()),
    // 2. Añade el proveedor de HttpClient aquí
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    importProvidersFrom(SocketIoModule.forRoot(config)), // Añadimos el proveedor del socket

    provideAnimations(), // Requerido para las animaciones de ngx-toastr
    provideToastr({      // Configuración de las notificaciones
      timeOut: 3000,
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
    }),
        { provide: LOCALE_ID, useValue: 'es' } // Establecemos 'es' como el locale por defecto
    
  ]
};
