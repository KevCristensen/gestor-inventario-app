import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from './chat.gateway';
import { MessageService } from './message.service';
import { ChatMessage } from './entities/chat-message.entity'; // Importar la entidad

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage])],
  providers: [ChatGateway, MessageService],
})
export class ChatModule {}
