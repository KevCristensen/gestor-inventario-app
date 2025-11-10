import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { INestApplication } from '@nestjs/common';

export class SocketIoAdapter extends IoAdapter {
  constructor(
    private app: INestApplication,
    private enableCors: boolean,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    if (this.enableCors) {
      // Si options no existe, lo inicializamos.
      const newOptions: Partial<ServerOptions> = options ? { ...options } : {};
      newOptions.cors = {
        origin: '*', // En producción, deberías cambiar esto por el dominio de tu frontend
      };
      return super.createIOServer(port, newOptions);
    }
    return super.createIOServer(port, options);
  }
}