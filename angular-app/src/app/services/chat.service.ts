import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket!: Socket;

  // Mantenemos el nombre de la API URL para claridad
  private chatApiUrl = `${environment.apiUrl}/api/chat`;

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
    if (this.socket?.connected) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    // Conectamos al servidor de Socket.IO que corre en Electron
    this.socket = io(environment.apiUrl);

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
      this.http.get<{ count: number }>(`${this.chatApiUrl}/unread-count/${user.id}`).subscribe(res => {
        this.unreadCountSubject.next(res.count);
      });
    }
  }

  markAsRead(userId: number, otherUserId: number): Observable<any> {
    // Este método ahora también actualiza el contador localmente para una respuesta más rápida.
    return this.http.post(`${this.chatApiUrl}/conversation/mark-as-read`, { userId, otherUserId }).pipe(
      tap(() => this.fetchUnreadCount())
    );
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // --- Métodos de API REST (para historial y usuarios) ---
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.chatApiUrl}/users`);
  }

  getConversation(userId: number, otherUserId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.chatApiUrl}/conversation/${userId}/${otherUserId}`);
  }

  // --- Métodos de Socket.IO (para tiempo real) ---
  sendMessage(messageData: any): Observable<any> {
    this.socket.emit('sendMessage', messageData);

    // En paralelo, guardamos el mensaje en la BD a través de la API.
    // El componente ya no necesita suscribirse a esto, el servicio lo maneja.
    return this.http.post(`${this.chatApiUrl}/messages`, messageData);
  }
  
  // --- Socket.IO Listeners ---
  onNewMessage(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('newMessage', (message) => observer.next(message));
    });
  }

}