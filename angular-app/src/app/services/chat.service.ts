import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment'; // 1. Usar variables de entorno

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket!: Socket;
  private apiUrl = `${environment.apiUrl}/api/chat`;

  // Unificamos el nombre para que coincida con el componente (unreadCount$)
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private onlineUsersSubject = new BehaviorSubject<string[]>([]);
  public onlineUsers$ = this.onlineUsersSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // --- Conexión de Socket.IO ---
  connect(): void {
    // 2. Si ya existe un socket, no hacemos nada.
    if (this.socket) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    // Conectamos al servidor de Socket.IO que corre en Electron
    this.socket = io(environment.apiUrl);

    // 3. Movemos toda la lógica de listeners a la conexión
    this.socket.on('connect', () => {
      console.log('Conectado al servidor de chat con ID:', this.socket.id);
      // Informamos al servidor que estamos en línea
      this.socket.emit('join', currentUser);
    });

    // Escuchamos la lista actualizada de usuarios en línea
    this.socket.on('updateOnlineUsers', (userIds: string[]) => {
      this.onlineUsersSubject.next(userIds);
    });

    // Inicializamos el contador de no leídos
    this.fetchUnreadCount();
  }

  fetchUnreadCount(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.http.get<{ count: number }>(`${this.apiUrl}/unread-count/${user.id}`).subscribe(res => {
        this.unreadCountSubject.next(res.count);
      });
    }
  }

  // 4. Ajustamos el método para que coincida con su uso en el componente
  markAsRead(userId: number, otherUserId: number): Observable<any> {
    const user = this.authService.getCurrentUser();
    // La ruta ahora es más estándar (RESTful)
    return this.http.post(`${this.apiUrl}/conversation/mark-as-read`, { userId, otherUserId });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      // @ts-ignore
      this.socket = null; // Liberamos la referencia
    }
  }

  // --- Métodos de API REST (para historial y usuarios) ---
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }

  getConversation(userId: number, otherUserId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/conversation/${userId}/${otherUserId}`); // La ruta ya era correcta
  }

  // --- Métodos de Socket.IO (para tiempo real) ---
  sendMessage(messageData: any): Observable<any> {
    // 5. Emitimos el evento de socket inmediatamente para el tiempo real.
    this.socket.emit('sendMessage', messageData);

    // En paralelo, guardamos el mensaje en la BD a través de la API.
    return this.http.post(`${this.apiUrl}/messages`, messageData);
  }
  
  // --- Socket.IO Listeners ---
  onNewMessage(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('newMessage', (message) => observer.next(message));
    });
  }

}