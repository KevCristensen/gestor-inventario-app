import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService, Message } from '../../services/chat.service'; // Importamos la interfaz Message
import { AuthService, User } from '../../services/auth.service'; // Mantenemos la interfaz User
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
  selectedUser: User | null = null;
  messages: Message[] = [];
  newMessage: string = '';
  currentUser: User | null;
  currentRoom: string | null = null;
  // Suscripción para los nuevos mensajes
  private newMessageSub!: Subscription;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private entitiesService: EntitiesService, // Inyectamos el servicio
    private cdr: ChangeDetectorRef,
    private zone: NgZone // Inyectamos NgZone
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngAfterViewChecked(): void {
    // Cada vez que se actualice la vista, hacemos scroll hacia abajo
    this.scrollToBottom();
  }

  ngOnInit(): void {
    this.loadUsers();
    
    // Nos suscribimos al observable que nos traerá los nuevos mensajes en tiempo real.
    this.newMessageSub = this.chatService.getNewMessage().subscribe((message: Message) => {
      console.log(`[ChatComponent] Mensaje recibido en tiempo real:`, message);
      console.log(`[ChatComponent] currentRoom: ${this.currentRoom}, message.room: ${message.room}`);

      // Solo añadimos el mensaje si pertenece a la sala que tenemos abierta.
      if (message.room === this.currentRoom) {
        this.zone.run(() => {
          // Si el mensaje recibido tiene un tempId y su autor somos nosotros,
          // significa que es la confirmación de un mensaje optimista.
          if (message.tempId && message.authorId === this.chatService.getCurrentSocketId()) {
            const existingOptimisticIndex = this.messages.findIndex(
              m => m.tempId === message.tempId && m.authorId === message.authorId
            );

            if (existingOptimisticIndex > -1) {
              // Reemplazamos el mensaje optimista con el mensaje real del backend
              this.messages[existingOptimisticIndex] = message;
            } else {
              // Si no encontramos el optimista (caso raro), lo añadimos de todas formas
              this.messages.push(message);
            }
          } else {
            // Es un mensaje de otro usuario o un mensaje nuestro sin tempId (ej. del historial)
            this.messages.push(message);
          }
          this.cdr.detectChanges();
          this.scrollToBottom(); // Aseguramos el scroll después de añadir/reemplazar
        });
      } else {
        console.log(`[ChatComponent] Mensaje para otra sala (${message.room}), ignorado. Sala actual: ${this.currentRoom}`);
      }
    });
  }

  ngOnDestroy(): void {
    // Limpiamos la suscripción al destruir el componente para evitar fugas de memoria.
    this.newMessageSub?.unsubscribe();
  }

  loadUsers(): void {
    this.chatService.getUsers().subscribe(users => {
      // Filtramos al usuario actual y los usuarios sin nombre.
      this.users = users.filter(u => u.id !== this.currentUser?.id && u.name);
      this.cdr.detectChanges();
    });
  }

  selectUser(user: User): void {
    if (!this.currentUser) return;

    this.selectedUser = user;
    this.messages = []; // Limpiamos los mensajes anteriores

    // Creamos un nombre de sala único y consistente ordenando los IDs.
    const roomName = [this.currentUser.id, user.id].sort().join('_');
    this.currentRoom = roomName;

    // 1. Le decimos al backend que queremos unirnos a esta sala.
    this.chatService.joinRoom(this.currentRoom);

    // 2. Pedimos el historial de la conversación a la API REST.
    this.chatService.getConversation(this.currentRoom).subscribe(history => {
      // Adaptamos el historial al nuevo formato de mensajes.
      this.messages = history.map(h => ({
        id: h.id,
        text: h.content, // Renombramos 'content' a 'text'
        room: this.currentRoom!,
        authorUserId: h.from_user_id, // Añadimos la propiedad que faltaba
        entityId: h.entity_id,         // Añadimos la propiedad que faltaba
        // Para el historial, el authorId no es el socket.id, sino el user.id
        // Usaremos un prefijo para diferenciarlo y poder aplicar estilos.
        authorId: `user_${h.from_user_id}`,
        createdAt: new Date(h.created_at)
      }));
      this.cdr.detectChanges();
    });

    // 3. Marcamos los mensajes como leídos (esto actualiza el contador en la burbuja)
    // La lógica de `markAsRead` sigue apuntando al backend antiguo, lo cual es correcto por ahora.
    this.chatService.markAsRead(user.id).subscribe(() => {
      // La actualización del contador se maneja dentro del servicio.
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.currentRoom) return;


    const messageDto = {
      // Generamos un ID temporal para el mensaje optimista
      tempId: Date.now(),
      text: this.newMessage,
      room: this.currentRoom!,
      authorUserId: this.currentUser!.id,
      entityId: this.currentUser!.entity_id
    };


    // --- ACTUALIZACIÓN OPTIMISTA ---
    // Añadimos el mensaje a la UI inmediatamente, sin esperar al backend.
    // Usamos el tempId como ID inicial para poder identificarlo y reemplazarlo después.
    const optimisticMessage: Message = {
      id: messageDto.tempId, // Usamos el tempId como ID inicial
      text: this.newMessage,
      room: this.currentRoom,
      authorUserId: this.currentUser!.id,   // Añadimos la propiedad que faltaba
      entityId: this.currentUser!.entity_id, // Añadimos la propiedad que faltaba
      authorId: this.chatService.getCurrentSocketId(), // ¡Nos identificamos como el autor!
      createdAt: new Date(),
      tempId: messageDto.tempId // Guardamos el tempId para la comparación
    };
    this.messages.push(optimisticMessage);

    // Enviamos el mensaje a través del servicio, que lo emitirá por socket.
    this.chatService.sendMessage(messageDto);

    this.newMessage = ''; // Limpiamos el input
    this.cdr.detectChanges();
  }

  // --- NUEVO: Comprueba si un mensaje es nuestro comparando el authorId con nuestro socketId ---
  isMyMessage(message: Message): boolean {
    // Comparamos el authorId del mensaje en tiempo real con nuestro socketId actual.
    // O, para mensajes del historial, comparamos el authorId (user_1) con nuestro ID de usuario.
    return message.authorId === this.chatService.getCurrentSocketId() || 
           message.authorId === `user_${this.currentUser?.id}`;
  }

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      } catch(err) { }
    }, 0);
  }
}
