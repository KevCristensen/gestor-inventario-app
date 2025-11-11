import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Socket } from 'ngx-socket-io';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';


// --- ¡NUEVA INTERFAZ! ---
// Define la estructura de un mensaje para mayor claridad en el código.
export interface Message {
  id: number;
  text: string;
  room: string;
  authorUserId: number; // Añadido
  entityId: number;     // Añadido
  authorId: string; // El ID del socket del autor
  createdAt: Date;
}



@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // La URL de la API REST (en el backend de Express) para obtener datos históricos.
  private apiUrl = 'http://localhost:3000/api/chat';
  // --- NUEVOS BehaviorSubjects para el estado global ---
  private isChatOpenSubject = new BehaviorSubject<boolean>(false);
  public isChatOpen$ = this.isChatOpenSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();


  constructor(
    // Inyectamos el socket que ya está configurado en app.config.ts para apuntar al backend de NestJS.
    private socket: Socket, // Inyectamos el socket configurado en app.config.ts
    private http: HttpClient,
    private authService: AuthService, // Inyectamos NgZone
    private ngZone: NgZone
  ) {
    // Opcional: Escuchar eventos de conexión/desconexión para depuración.
    this.socket.on('connect', () => {
      console.log('(Angular-Frontend) Conectado al servidor de chat NestJS con ID:', this.socket.ioSocket.id);
      // Cuando nos conectamos (o reconectamos), pedimos el contador de no leídos.
      this.fetchUnreadCount();
    });

    // Escuchamos los mensajes nuevos aquí para actualizar el contador
    this.getNewMessage().subscribe(message => {
      if (!this.isChatOpenSubject.value) {
        this.ngZone.run(() => {
          this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
        });
      }
    });
  }

  // --- MÉTODOS NUEVOS BASADOS EN SALAS ---
  
  // Obtiene la lista de usuarios desde la API REST (esto no cambia).
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }

  // Obtiene la conversación de una sala. La lógica de la API REST no cambia por ahora.
  getConversation(room: string): Observable<any[]> {
    // El backend antiguo usa dos IDs. Los extraemos del nombre de la sala.
    const [userId1, userId2] = room.split('_');
    return this.http.get<any[]>(`${this.apiUrl}/conversation/${userId1}/${userId2}`);
  }

  // Se une a una sala específica.
  joinRoom(roomId: string): void {
    this.socket.emit('joinRoom', roomId);
  }

  // Envía un mensaje a una sala.
  sendMessage(messageDto: { text: string, room: string, authorUserId: number, entityId: number }): void {
    this.socket.emit('createMessage', messageDto);
  }

  // Escucha los nuevos mensajes que llegan a la sala.
  getNewMessage(): Observable<Message> {
    return this.socket.fromEvent<Message>('message');
  }

  // Obtiene el ID del socket actual para saber si un mensaje es nuestro.
  getCurrentSocketId(): string {
    return this.socket.ioSocket.id || '';
  }
  
  // --- NUEVOS MÉTODOS PARA LA BURBUJA Y CONTADORES ---

  toggleChat(): void {
    this.isChatOpenSubject.next(!this.isChatOpenSubject.value);
  }

  // Obtiene el contador de mensajes no leídos desde el backend antiguo
  fetchUnreadCount(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.http.get<{ count: number }>(`${this.apiUrl}/unread-count/${user.id}`).subscribe(data => {
        this.ngZone.run(() => {
          this.unreadCountSubject.next(data.count);
        });
      });
    }
  }

  // Marca los mensajes como leídos (apunta al backend antiguo)
  markAsRead(fromUserId: number): Observable<any> {
    const user = this.authService.getCurrentUser();
    if (user) {
      return this.http.post(`${this.apiUrl}/mark-as-read`, {
        to_user_id: user.id,
        from_user_id: fromUserId
      }).pipe(tap(() => this.fetchUnreadCount())); // Después de marcar, actualiza el contador
    }
    return new Observable(obs => obs.complete());
  }
}