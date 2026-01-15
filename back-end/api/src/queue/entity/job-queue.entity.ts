import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm"; 

export enum JobQueueStatusEnum {
    PENDING = 'pending',
    PROCESSING = 'processing',
    FINISHED = 'finished',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}


@Entity('job_queues')
export class JobQueueEntity extends AppBaseEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'name', type: 'varchar' })
  @Index()
  name: string;

  @Column({ name: 'payload', type: 'jsonb' })
  payload: JobPayloadDto;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  @Index()
  scheduledAt: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  @Index()
  processedAt: Date | null;

  @Column({ name: 'status', type: 'enum', enum: JobQueueStatusEnum, default: JobQueueStatusEnum.PENDING })
  @Index()
  status: JobQueueStatusEnum;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  @Index()
  attempts: number;

  @Column({ name: 'error_message', type: 'varchar', nullable: true })
  errorMessage: string | null;
}

export interface JobPayloadDto {
    payLoadId: number;
    payloadType: string;
    triggeredBy: 'schedule' | 'manual';
    maximumAttempts: number;
}