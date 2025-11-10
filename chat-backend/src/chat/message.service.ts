import { Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessageService {
  // Lógica de ejemplo. Aquí iría tu interacción con la base de datos.
  private messages: any[] = [];

  async create(createMessageDto: CreateMessageDto, authorId: string) {
    const message = {
      id: this.messages.length + 1,
      text: createMessageDto.text,
      room: createMessageDto.room,
      authorId: authorId, // Guardamos quién lo envió
      createdAt: new Date(),
    };
    this.messages.push(message);
    return message; // Devolvemos el mensaje completo
  }
}
