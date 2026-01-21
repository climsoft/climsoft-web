import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm"; 

export enum JobQueueStatusEnum {
    PENDING = 'pending',
    PROCESSING = 'processing',
    FINISHED = 'finished',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

// Note changes to this enum should be followed by changes to emit listeners
export enum JobTypeEnum {
    CONNECTOR_IMPORT = 'connector.import',
    CONNECTOR_EXPORT = 'connector.export'
}

export enum JobTriggerEnum {
    SCHEDULE = 'schedule',
    MANUAL = 'manual'
}

@Entity('job_queues')
export class JobQueueEntity extends AppBaseEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'name', type: 'varchar' })
  @Index()
  name: string;

  @Column({ name: 'job_type', type: 'enum', enum: JobTypeEnum })
  @Index()
  jobType: JobTypeEnum;

  @Column({ name: 'triggered_by', type: 'enum', enum: JobTriggerEnum })
  @Index()
  triggeredBy: JobTriggerEnum;

  @Column({ name: 'payload', type: 'jsonb' })
  payload: Record<string, any>;

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

  @Column({ name: 'max_attempts', type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ name: 'error_message', type: 'varchar', nullable: true })
  errorMessage: string | null;
}

// Connector-specific payload interface
export interface ConnectorJobPayloadDto {
    connectorId: number;
}