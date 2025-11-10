import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { AuthService, User } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { EntitiesService } from '../../services/entities.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  // --- ¡LA SOLUCIÓN ESTÁ AQUÍ! ---
  host: {
    // Le decimos al componente que se comporte como un item flex que puede crecer.
    // Esto hace que <app-chat> ocupe todo el espacio vertical disponible.
    class: 'flex flex-grow'
  }
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  users: any[] = [];
  selectedUser: any = null;
  messages: any[] = [];
  newMessage: string = '';
  currentUser: User | null;
  onlineUserIds: string[] = [];

  // Suscripciones para una limpieza adecuada
  private onlineUsersSub!: Subscription;
  private newMessageSub!: Subscription;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private entitiesService: EntitiesService, // Inyectamos el servicio
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngAfterViewChecked(): void {
    // Cada vez que se actualice la vista, hacemos scroll hacia abajo
    this.scrollToBottom();
  }

  ngOnInit(): void {
    this.chatService.connect();
    this.loadUsers();

    // Escuchamos la lista de usuarios en línea en tiempo real
    this.onlineUsersSub = this.chatService.onlineUsers$.subscribe(userIds => {
      this.onlineUserIds = userIds;
      // Cada vez que cambia el estado online, reordenamos la lista de usuarios
      if (this.users.length > 0) {
        this.sortUsers();
      }
      this.cdr.detectChanges();
    });

    // --- ¡LA MAGIA DEL TIEMPO REAL! ---
    // Escuchamos los nuevos mensajes que llegan por el socket.
    this.newMessageSub = this.chatService.newMessage$.subscribe((message: any) => {
      // Si el mensaje recibido es de la conversación que tenemos abierta...
      if (this.selectedUser && message.from_user_id === this.selectedUser.id) {
        this.messages.push(message);
        this.cdr.detectChanges();
        // Podríamos añadir una llamada para marcarlo como leído aquí
      } else {
        // Si es de otra conversación, actualizamos el contador de no leídos
        this.chatService.fetchUnreadCount();
        // Opcional: mostrar una notificación
        this.notificationService.showInfo(`Nuevo mensaje de ${message.user_name}`, 'Chat');
      } 
    });
  }

  ngOnDestroy(): void {
    // Limpiamos las suscripciones y desconectamos el socket al salir del componente
    this.onlineUsersSub?.unsubscribe();
    this.newMessageSub?.unsubscribe();
    this.chatService.disconnect();
  }

  loadUsers(): void {
    this.chatService.getUsers().subscribe(users => {
      // Filtramos al usuario actual y los usuarios sin nombre
      this.users = users.filter(u => u.id !== this.currentUser?.id && u.name);
      this.sortUsers(); // Ordenamos la lista inicial
      this.cdr.detectChanges(); // Forzamos la actualización de la vista
    });
  }

  selectUser(user: any): void {
    this.selectedUser = user;
    this.messages = []; // Limpiamos los mensajes anteriores
    if (this.currentUser?.id) { // Aseguramos que currentUser y su ID existan
      this.chatService.getConversation(this.currentUser.id, user.id).subscribe(messages => {
        this.messages = messages;
        this.cdr.detectChanges();
      });
    }
  }

  // NUEVO: Método para ordenar usuarios (en línea primero, luego alfabéticamente)
  private sortUsers(): void {
    this.users.sort((a, b) => {
      const aIsOnline = this.isUserOnline(a.id);
      const bIsOnline = this.isUserOnline(b.id);
      if (aIsOnline && !bIsOnline) return -1;
      if (!aIsOnline && bIsOnline) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedUser || !this.currentUser?.id) return; // Aseguramos que currentUser y su ID existan

    const messageData = {
      from_user_id: this.currentUser.id,
      to_user_id: this.selectedUser.id,
      content: this.newMessage,
      entity_id: this.currentUser.entity_id,
      // Añadimos datos extra para la actualización optimista
      user_name: this.currentUser.name,
      created_at: new Date().toISOString()
    };

    console.log('[DEBUG] Checkpoint A: Componente va a enviar mensaje:', messageData);

    // Actualización optimista: añadimos el mensaje a la UI inmediatamente
    this.messages.push(messageData);

    // Enviamos el mensaje a través del servicio (que usa sockets y API)
    this.chatService.sendMessage(messageData).subscribe({
      error: () => this.notificationService.showError('No se pudo enviar el mensaje.')
    });

    this.newMessage = ''; // Limpiamos el input
    this.cdr.detectChanges();
  }

  isUserOnline(userId: number): boolean {
    return this.onlineUserIds.includes(userId.toString());
  }

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      } catch(err) { }
    }, 0);
  }
}
