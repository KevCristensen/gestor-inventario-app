import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'; // Router ya está aquí, perfecto.
import { AuthService, User } from '../../services/auth.service';
import { EntitiesService } from '../../services/entities.service';
import { ConnectionService } from '../../services/connection.service';
import { Observable, filter, switchMap, of, catchError, map } from 'rxjs';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
})
export class LayoutComponent implements OnInit {
  currentUser$: Observable<User | null>;
  isOnline$: Observable<boolean>;
  entityName$: Observable<string>;
  isSidebarCollapsed = false; // Estado para el menú lateral


  constructor(
    public authService: AuthService,
    private entitiesService: EntitiesService, 
    private router: Router,
    private cdr: ChangeDetectorRef,
    private connectionService: ConnectionService,
  ) {
    this.currentUser$ = this.authService.currentUser;
    this.isOnline$ = this.connectionService.isOnline$;

    this.entityName$ = this.currentUser$.pipe(
      filter((user): user is User => !!user), // Aseguramos que el usuario no sea null
      switchMap(user => {
        return this.entitiesService.getEntityById(user.entity_id).pipe(
          catchError(err => {
            console.error('Error al obtener el nombre de la entidad:', err);
            return of({ name: 'Entidad no encontrada' }); // Devuelve un objeto con 'name' en caso de error
          })
        );
      }),
      map((entity: { name: string }) => entity.name) // Extraemos la propiedad 'name' del objeto entidad
    );
  }

  ngOnInit(): void {}

  updateStatus(status: 'en linea' | 'ausente' | 'ocupado'): void {
    if (this.authService.currentUserValue) {
      this.authService.updateStatus(status).subscribe();
    }
  }

  logout() {
    this.authService.logout();
    // La navegación ahora la gestiona el propio authService.logout()
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}