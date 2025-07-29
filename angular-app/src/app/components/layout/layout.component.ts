import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { EntitiesService } from '../../services/entities.service'; 
import { ConnectionService } from '../../services/connection.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common'; 


@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
})
export class LayoutComponent implements OnInit {
  userRole: string | null = null;
  currentUser: any = null;
  entityName: string = 'Cargando...';
  isOnline$: Observable<boolean>;

  constructor(
    private authService: AuthService,
    private entitiesService: EntitiesService, 
    private router: Router,
    private cdr: ChangeDetectorRef,
    private connectionService: ConnectionService
  ) {
    this.isOnline$ = this.connectionService.isOnline$;
  }

  ngOnInit(): void {
    this.userRole = this.authService.getUserRole();
    this.currentUser = this.authService.getCurrentUser(); 
    // 4. Busca el nombre del colegio
    if (this.currentUser && this.currentUser.entity_id) {
      this.entitiesService.getEntityById(this.currentUser.entity_id).subscribe(entity => {
        this.entityName = entity.name;
        this.cdr.detectChanges();
      });
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}