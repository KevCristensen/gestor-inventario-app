import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { ChatMessage } from './entities/chat-message.entity';
import { Socket } from 'socket.io'; // Importar Socket para tipado

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
  ) {}

  async create(createMessageDto: CreateMessageDto, client: Socket) {
    console.log(`[MessageService] Iniciando creación de mensaje. DTO:`, createMessageDto);
    const { room, text, authorUserId, entityId, tempId } = createMessageDto; // Destructuramos tempId

    // Extraemos los IDs de usuario de la sala.
    // Asumimos que la sala es siempre 'ID1_ID2' donde ID1 < ID2
    const roomParticipants = room.split('_').map(id => parseInt(id, 10));
    
    // El toUserId es el otro participante de la sala que no es el autor
    const toUserId = roomParticipants.find(id => id !== authorUserId);
    console.log(`[MessageService] Sala: ${room}, Autor: ${authorUserId}, Destinatario: ${toUserId}`);

    if (!toUserId) {
      // Esto no debería pasar si la sala está bien formada y el authorUserId es uno de los participantes
      console.error(`Error: No se pudo determinar el destinatario para la sala ${room} y el autor ${authorUserId}`);
      throw new Error('Invalid room or author ID for message creation.');
    }
    
    console.log(`[MessageService] Creando nueva entidad ChatMessage...`);
    const newMessage = this.messageRepository.create({
      from_user_id: authorUserId,
      to_user_id: toUserId,
      entity_id: entityId,
      message_text: text,
      is_read: false, // Por defecto, el mensaje no ha sido leído
    });
    console.log(`[MessageService] Entidad creada:`, newMessage);

    console.log(`[MessageService] Guardando mensaje en la base de datos...`);
    const savedMessage = await this.messageRepository.save(newMessage);

    // Devolvemos un objeto que el frontend entienda
    return {
      ...savedMessage,
      authorId: client.id, // El ID del socket del autor para la UI
      room: room,
      text: savedMessage.message_text,
      createdAt: savedMessage.created_at, // Aseguramos que la fecha esté en el formato correcto
      tempId: tempId, // Devolvemos el tempId si se proporcionó
    };
  }
}
