import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';

// El decorador Gateway ahora escucha en la raíz, pero el namespace 'chat' sigue funcionando
// gracias a la configuración del cliente.
@WebSocketGateway({
  // No especificamos puerto aquí, dejamos que se adjunte al servidor principal de NestJS
  // Pero sí especificamos el namespace para ser explícitos.
  namespace: 'chat',
  cors: {
    origin: '*', // Para depuración, permitimos todo. Luego podemos restringirlo.
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly messageService: MessageService) {}

  handleConnection(client: Socket) {
    console.log(`(Chat-Backend) Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`(Chat-Backend) Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ): void {
    console.log(`(Chat-Backend) Cliente ${client.id} se unió a la sala: ${room}`);
    client.join(room);
  }

  @SubscribeMessage('createMessage')
  async handleCreateMessage(
    @MessageBody() createMessageDto: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    console.log(`[ChatGateway] Recibido 'createMessage' de ${client.id}. DTO:`, createMessageDto);
    try {
      const message = await this.messageService.create(createMessageDto, client);
      console.log(`[ChatGateway] Mensaje guardado y procesado:`, message);
      this.server.to(createMessageDto.room).emit('message', message);
      console.log(`[ChatGateway] Mensaje emitido a la sala '${createMessageDto.room}'.`);
    } catch (error) {
      console.error(`[ChatGateway] Error al procesar mensaje de ${client.id}:`, error);
    }
  }
}
