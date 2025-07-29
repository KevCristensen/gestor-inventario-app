import { Injectable } from '@angular/core';
import { fromEvent, Observable, merge, of } from 'rxjs';
import { map, startWith, distinctUntilChanged, pairwise, filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  // Un observable que emite 'true' si hay conexión, y 'false' si no.
  public isOnline$: Observable<boolean>;

  // Un observable que emite un evento SOLO cuando la conexión vuelve.
  public reconnected$: Observable<boolean>;

  constructor() {
    // Crea observables a partir de los eventos 'online' y 'offline' del navegador
    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));

    // Combina ambos eventos y empieza con el estado actual de la conexión
    this.isOnline$ = merge(online$, offline$).pipe(
      startWith(navigator.onLine)
    );

    // Compara el estado anterior con el nuevo para detectar la reconexión
    this.reconnected$ = this.isOnline$.pipe(
      distinctUntilChanged(), // Solo emite si el valor cambia
      pairwise(),             // Emite el valor anterior y el actual juntos [anterior, actual]
      filter(([wasOffline, isOnline]) => !wasOffline && isOnline), // Filtra solo cuando pasamos de offline (false) a online (true)
      map(() => true)
    );
  }
}