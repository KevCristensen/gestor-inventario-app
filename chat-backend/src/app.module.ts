import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [ChatModule], // ¡AÑADIR ESTA LÍNEA!
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
