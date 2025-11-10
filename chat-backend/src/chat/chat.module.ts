import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessageService } from './message.service';

@Module({
  providers: [ChatGateway, MessageService],
})
export class ChatModule {}
