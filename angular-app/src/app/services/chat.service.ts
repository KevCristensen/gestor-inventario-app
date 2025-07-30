import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs'; // Importa BehaviorSubject
import { tap } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: Socket;
  private url = 'http://localhost:3000';
  private apiUrl = `${this.url}/api/chat`;
  public unreadMessages$ = new BehaviorSubject<number>(0);

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.socket = io(this.url, { autoConnect: false });
  }

  // --- Conexión de Socket.IO ---
  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
      const user = this.authService.getCurrentUser();
      if (user) {
        this.socket.emit('join', user);
      }
    }
  }

  fetchUnreadCount(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.http.get<{ count: number }>(`${this.apiUrl}/unread-count/${user.id}`).subscribe(res => {
        this.unreadMessages$.next(res.count);
      });
    }
  }

  markAsRead(otherUserId: number): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.http.post(`${this.apiUrl}/messages/mark-as-read`, { userId: user.id, otherUserId }).subscribe(() => {
        // Después de marcar como leído, actualiza el conteo global
        this.fetchUnreadCount();
      });
    }
  }

  disconnect(): void {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  // --- API Endpoints ---
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }

  getConversation(userId: number, otherUserId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/conversation/${userId}/${otherUserId}`);
  }

  sendMessage(messageData: any): Observable<any> {
    // 1. Guarda el mensaje en la BD a través de la API
    return this.http.post<any>(`${this.apiUrl}/message`, messageData).pipe(
      // 2. Después de guardarlo, emite la notificación por Socket.IO
      tap(() => {
        this.socket.emit('sendMessage', messageData);
      })
    );
  }
  
  // --- Socket.IO Listeners ---
  onNewMessage(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('newMessage', (message) => observer.next(message));
    });
  }
}