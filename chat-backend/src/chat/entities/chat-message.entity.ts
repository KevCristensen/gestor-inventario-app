import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'from_user_id' }) // Mapea a la columna from_user_id
  from_user_id: number;

  @Column({ name: 'to_user_id', nullable: true }) // Mapea a la columna to_user_id
  to_user_id: number;

  @Column({ name: 'entity_id' }) // Mapea a la columna entity_id
  entity_id: number;

  @Column({ name: 'message_text', type: 'text' }) // Mapea a la columna message_text
  message_text: string;

  @CreateDateColumn({ name: 'created_at' }) // Mapea a la columna created_at
  created_at: Date;

  @Column({ name: 'is_read', default: false }) // Mapea a la columna is_read
  is_read: boolean;

  // Propiedades que no están en la BD pero que usamos en la lógica
  room?: string;
  authorId?: string;
}
