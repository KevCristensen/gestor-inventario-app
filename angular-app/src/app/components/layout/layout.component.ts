import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'; // Router ya está aquí, perfecto.
import { AuthService, User } from '../../services/auth.service';
import { EntitiesService } from '../../services/entities.service';
import { ConnectionService } from '../../services/connection.service';
import { ChatService } from '../../services/chat.service'; // 1. Importar ChatService
import { Observable, filter, switchMap, of, catchError, map } from 'rxjs';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { ChatBubbleComponent } from '../../shared/components/chat-bubble/chat-bubble.component'; // 2. Importar la burbuja
import { ChatComponent } from '../../pages/chat/chat.component'; // 3. Importar el componente de chat


@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive, ChatBubbleComponent, ChatComponent], // 4. Añadir los componentes
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'] // ¡AÑADIR ESTA LÍNEA!
})
export class LayoutComponent implements OnInit {
  currentUser$: Observable<User | null>;
  isOnline$: Observable<boolean>;
  entityName$: Observable<string>;
  isSidebarCollapsed = false; // Estado para el menú lateral
  isChatOpen$: Observable<boolean>; // 5. Observable para el estado del chat


  constructor(
    public authService: AuthService,
    private entitiesService: EntitiesService, 
    private router: Router,
    private cdr: ChangeDetectorRef,
    private connectionService: ConnectionService,
    public chatService: ChatService // 6. Inyectar ChatService
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

    // 7. Nos suscribimos al estado del chat desde el servicio
    this.isChatOpen$ = this.chatService.isChatOpen$;
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