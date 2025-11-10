// /Users/kevinbriancristensensepulveda/Development/gestor-inventario/angular-app/src/app/shared/components/chat-bubble/chat-bubble.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../services/chat.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-chat-bubble',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-bubble.component.html',
  styleUrls: ['./chat-bubble.component.scss']
})
export class ChatBubbleComponent implements OnInit {
  unreadCount = 0;

  constructor(private chatService: ChatService, private cdr: ChangeDetectorRef) {} // Inyectar ChangeDetectorRef

  ngOnInit(): void {
    // Nos suscribimos al contador de no leídos del servicio
    this.chatService.unreadCount$.subscribe(count => {
      // Diferimos la actualización para el siguiente ciclo de detección de cambios
      setTimeout(() => {
        this.unreadCount = count;
        this.cdr.detectChanges(); // Forzar la detección de cambios para este componente
      }, 0);
    });
  }

  toggleChat(): void {
    // Llamamos al método del servicio para abrir/cerrar el chat
    this.chatService.toggleChat();
  }
}
