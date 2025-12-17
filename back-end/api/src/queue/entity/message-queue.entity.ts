import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { MessageQueueStatusEnum } from "../../metadata/connector-specifications/enums/message-queue-status.enum";

@Entity('message_queues')
export class MessageQueueEntity extends AppBaseEntity {
  @PrimaryGeneratedColumn({ name: "id" }) // TODO. Change SERIAL PRIMARY KEY
  id: string;

  @Column({ name: 'name', type: 'varchar' })
  @Index()
  name: string;

  @Column({ name: "payload", type: 'jsonb', })
  payload: string | null;

  @Column({ name: "created_at", type: 'timestamptz' })
  @Index()
  createdAt: Date;

  @Column({ name: "scheduled_at", type: 'timestamptz' })
  @Index()
  scheduledAt: Date;

  @Column({ name: "processed_at", type: 'timestamptz' })
  @Index()
  processedAt: Date;

  @Column({ name: "status", type: "enum", enum: MessageQueueStatusEnum })
  @Index()
  status: MessageQueueStatusEnum;

  @Column({ name: "attempts ", type: 'int' })
  @Index()
  attempts: number;

  @Column({ name: "error_message ", type: 'varchar' })
  @Index()
  errorMmessage: string;
}

