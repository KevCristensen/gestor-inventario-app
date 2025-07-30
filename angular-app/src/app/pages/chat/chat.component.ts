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

    this.subscriptions.add(this.chatService.onNewMessage().subscribe((message: any) => {
      const otherUserId = message.from_user_id === this.currentUser.id ? message.to_user_id : message.from_user_id;
      if (!this.conversations[otherUserId]) {
        this.conversations[otherUserId] = [];
      }
      this.conversations[otherUserId].push(message);

      if (message.from_user_id !== this.selectedUserId) {
        this.chatService.fetchUnreadCount();
    }

      // Si el mensaje es de otra persona y no tenemos esa ventana de chat abierta, suena la notificación
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
      this.chatService.getConversation(this.currentUser.id, user.id).subscribe(messages => {
        this.conversations[user.id] = messages;
        this.cdr.detectChanges();
        this.scrollToBottom(); // 4. Y también aquí
      });
    } else {
      this.scrollToBottom(); // Y si la conversación ya existía
    }
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

