import { Component } from '@angular/core';
import { Router } from '@angular/router'; 
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service'; 
import { NotificationService } from '../../services/notification.service'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  credentials = {
    email: '', // <- Si se quiere hacer pruebas hay que rellenar los campos
    password: '',
  };
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  onLogin() {
    this.errorMessage = null;
    if (!this.credentials.email || !this.credentials.password) {
      this.errorMessage = 'Por favor, ingresa tu correo y contraseña.';
      return;
    }

    // 3. USA EL SERVICIO PARA INICIAR SESIÓN
    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        console.log('Login exitoso!', response);
        this.notificationService.showSuccess('Login exitoso!');
        // 3. Navega al dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        // Si hay un error (ej. credenciales inválidas)
        console.error('Error en el login:', err);
        const errorMessage = err.error?.error || 'Ocurrió un error inesperado.';
        this.notificationService.showError(errorMessage);
      }
    });
  }
}

