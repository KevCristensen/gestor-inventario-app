export class CreateMessageDto {
  text: string;
  room: string;
  authorUserId: number;
  entityId: number;
  tempId?: number; // Añadimos tempId opcional
}
