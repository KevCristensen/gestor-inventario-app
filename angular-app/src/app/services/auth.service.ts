import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

// Definimos y exportamos la interfaz User
export interface User {
  id: number;
  name: string;
  email: string;  
  role: 'admin' | 'nutricionista' | 'bodega' | 'losa';
  status: 'en linea' | 'ausente' | 'ocupado';
  entity_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const user = this.getCurrentUserFromStorage();
    this.currentUserSubject = new BehaviorSubject<User | null>(user);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  login(credentials: {email: string, password: string}): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.setSession(response))
    );
  }

  updateStatus(status: 'en linea' | 'ausente' | 'ocupado'): Observable<any> {
    const userId = this.currentUserValue?.id;
    return this.http.put(`${this.apiUrl}/status`, { userId, status }).pipe(
      tap(() => this.updateLocalUserStatus(status))
    );
  }

  private updateLocalUserStatus(status: 'en linea' | 'ausente' | 'ocupado'): void {
    const currentUser = this.currentUserValue;
    if (currentUser) {
      this.currentUserSubject.next({ ...currentUser, status });
    }
  }

  private setSession(authResult: any) {
    sessionStorage.setItem('auth_token', authResult.token);
    sessionStorage.setItem('auth_user', JSON.stringify(authResult.user));
    this.currentUserSubject.next(authResult.user);
  }

  logout() {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // --- MÉTODOS ANTIGUOS RESTAURADOS PARA COMPATIBILIDAD ---
  getCurrentUser(): User | null {
    return this.currentUserValue;
  }

  getUserRole(): string | null {
    const user = this.currentUserValue;
    return user ? user.role : null;
  }
  // ---------------------------------------------------------

  private getCurrentUserFromStorage(): User | null {
    const user = sessionStorage.getItem('auth_user');
    return user ? JSON.parse(user) : null;
  }

  getToken(): string | null {
    return sessionStorage.getItem('auth_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const user = this.currentUserValue;
    return !!user && user.role === 'admin';
  }

  hasRole(allowedRoles: string | string[]): boolean {
    const user = this.currentUserValue;
    if (!user || !user.role) {
      return false;
    }
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.includes(user.role);
  }

  getHomePageForRole(role: string): string {
    switch (role) {
      case 'admin':
      case 'nutricionista':
      case 'bodega':
        return '/dashboard'; // Estos roles sí pueden ver el dashboard.
      case 'losa':
        return '/dashboard/assets'; // El rol de losa va directo a Activos Fijos.
      default:
        return '/dashboard'; // Un fallback seguro.
    }
  }
}