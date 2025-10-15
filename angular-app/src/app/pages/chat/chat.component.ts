import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { EntitiesService } from '../../services/entities.service'; // Importamos el servicio de entidades

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
})
export class ChatComponent implements OnInit, OnDestroy {
  conversations: { [key: string]: any[] } = {};
  groupedUsers: { [entityName: string]: any[] } = {}; 
  newMessage: string = '';
  currentUser: any;
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  onlineUserIds: Set<string> = new Set();

  private notificationSound = new Audio('assets/audio/notification.mp3');
  
  selectedUserId: number | null = null;
  selectedUserName: string = '';

  private subscriptions = new Subscription();

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private entitiesService: EntitiesService, // Inyectamos el servicio
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.chatService.connect();
    
    this.loadUsersAndGroupThem();

    this.subscriptions.add(this.chatService.onlineUsers$.subscribe(ids => {
      this.onlineUserIds = new Set(ids);
      this.cdr.detectChanges(); // Forzar la detección de cambios
    }));

    this.subscriptions.add(this.chatService.onNewMessage().subscribe((message: any) => {
      const otherUserId = message.from_user_id === this.currentUser.id ? message.to_user_id : message.from_user_id;
      if (!this.conversations[otherUserId]) {
        this.conversations[otherUserId] = [];
      }
      this.conversations[otherUserId].push(message);

      // Si el mensaje recibido es para la conversación activa, lo marcamos como leído
      if (message.from_user_id === this.selectedUserId) {
        this.markConversationAsRead(this.currentUser.id, message.from_user_id);
      } else {
        // Si no, actualizamos el contador de no leídos
        this.chatService.fetchUnreadCount();
      }
      if (message.from_user_id !== this.currentUser.id && this.selectedUserId !== message.from_user_id) {
        this.notificationSound.play();
      }
      this.cdr.detectChanges();
      this.scrollToBottom();
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.chatService.disconnect();
  }

  loadUsersAndGroupThem(): void {
    // Primero obtenemos todas las entidades (colegios)
    this.entitiesService.getEntities().subscribe(entities => {
      // Luego obtenemos todos los usuarios
      this.chatService.getUsers().subscribe(users => {
        const grouped: { [key: string]: any[] } = {};
        entities.forEach((entity: any) => {
          // Para cada colegio, filtramos los usuarios que le pertenecen
          const entityUsers = users.filter(u => u.entity_id === entity.id && u.id !== this.currentUser.id);
          if (entityUsers.length > 0) {
            grouped[entity.name] = entityUsers;
          }
        });
        this.groupedUsers = grouped;
        this.cdr.detectChanges();
      });
    });
  }

  selectUser(user: any): void {
    this.selectedUserId = user.id;
    this.selectedUserName = user.name;
    if (!this.conversations[user.id]) {
      this.conversations[user.id] = []; // Inicializa para evitar nulls
      this.chatService.getConversation(this.currentUser.id, user.id).subscribe(messages => {
        this.conversations[user.id] = messages;
        this.markConversationAsRead(this.currentUser.id, user.id);
        this.cdr.detectChanges();
        this.scrollToBottom();
      });
    } else {
      // Si ya existía, igual marcamos como leída y actualizamos contadores
      this.markConversationAsRead(this.currentUser.id, user.id);
      this.scrollToBottom(); // Y si la conversación ya existía
    }
  }
  markConversationAsRead(userId: number, otherUserId: number) {
    this.chatService.markAsRead(userId, otherUserId).subscribe(() => {
      this.chatService.fetchUnreadCount(); // Actualiza el contador global
    });
  }

  sendMessage(): void {
    if (this.newMessage.trim() === '' || !this.selectedUserId) return;
    
    const messageData = {
      from_user_id: this.currentUser.id,
      to_user_id: this.selectedUserId,
      message_text: this.newMessage,
      user_name: this.currentUser.name,
      created_at: new Date().toISOString() // Añadimos la fecha para la vista local
    };

    // Añade el mensaje localmente de inmediato para una mejor experiencia
    if (!this.conversations[this.selectedUserId]) {
      this.conversations[this.selectedUserId] = [];
    }
    this.conversations[this.selectedUserId].push(messageData);
    this.scrollToBottom();
    this.cdr.detectChanges();

    // Luego, envía el mensaje al servidor en segundo plano
    this.chatService.sendMessage(messageData).subscribe({
      error: () => {
        this.notificationService.showError('No se pudo enviar el mensaje.');
        // Opcional: podrías añadir una lógica para marcar el mensaje como "no enviado"
      }
    });

    this.newMessage = '';
  }

  get currentMessages(): any[] {
    return this.selectedUserId ? this.conversations[this.selectedUserId] || [] : [];
  }

  getObjectKeys(obj: any) {
    return Object.keys(obj);
  }

  isOnline(userId: number): boolean {
    return this.onlineUserIds.has(userId.toString());
  }

  scrollToBottom(): void {
    // Usamos un pequeño timeout para asegurar que el DOM se haya actualizado
    setTimeout(() => {
      try {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      } catch (err) { 
        console.error("Error al hacer scroll:", err);
      }
    }, 0);
  }

}
