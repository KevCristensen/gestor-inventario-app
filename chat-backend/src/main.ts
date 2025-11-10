import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// Esta función se ejecutará cuando la aplicación NestJS se inicie
async function bootstrap() {
  // Creamos una instancia de la aplicación NestJS
  // y habilitamos CORS para permitir conexiones desde cualquier origen
  const app = await NestFactory.create(AppModule, { cors: true });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
