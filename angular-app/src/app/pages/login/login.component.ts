import { Component } from '@angular/core';
import { Router } from '@angular/router'; 
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  credentials = {
    email: 'admin@test.com', // <- Puedes pre-llenarlo para pruebas
    password: 'admin',
  };
  errorMessage: string | null = null;

  // 2. INYECTA EL SERVICIO EN EL CONSTRUCTOR
  constructor(
    private authService: AuthService,
    private router: Router,
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
        alert('Login exitoso!');
        // 3. Navega al dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        // Si hay un error (ej. credenciales inválidas)
        console.error('Error en el login:', err);
        this.errorMessage = err.error?.message || 'Ocurrió un error inesperado.';
      }
    });
  }
}

