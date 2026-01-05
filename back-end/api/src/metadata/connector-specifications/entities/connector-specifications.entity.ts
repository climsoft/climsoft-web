import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { ConnectorTypeEnum } from "../enums/connector-type.enum";
import { ProtocolEnum } from "../enums/protocol.enum";

@Entity("connector_specifications")
@Check("CHK_connector_specifications_name_not_empty", `"name" <> ''`)
export class ConnectorSpecificationEntity extends AppBaseEntity {
  @PrimaryGeneratedColumn({ name: "id" })
  id: number;

  @Column({ name: 'name', type: 'varchar', unique: true })
  name: string;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string | null;

  @Column({ name: 'connector_type', type: 'enum', enum: ConnectorTypeEnum })
  @Index()
  connectorType: ConnectorTypeEnum;

  @Column({ name: "server_ip_address", type: 'varchar' })
  @Index()
  serverIPAddress: string;

  @Column({ name: 'protocol', type: 'enum', enum: ProtocolEnum })
  @Index()
  protocol: ProtocolEnum;

  @Column({ name: "port", type: 'int' })
  @Index()
  port: number;

  @Column({ name: "username", type: 'varchar' })
  @Index()
  username: string;

  @Column({ name: "password", type: 'varchar' })
  @Index()
  password: string;

  @Column({ name: 'timeout', type: 'int' })
  @Index()
  timeout: number; // in seconds

  @Column({ name: "retries", type: "int" })
  @Index()
  retries: number;

  @Column({ name: 'cron_schedule', type: 'varchar' })
  @Index()
  cronSchedule: string; // Cron pattern (e.g., '0 2 * * *' for 2 AM daily)

  @Column({ name: 'specification_ids', type: 'int', array: true })
  @Index()
  specificationIds: number[]; // Array of source_specification or export_specification IDs

  @Column({ name: "extra_metadata", type: 'jsonb', nullable: true })
  extraMetadata: any | null;

  @Column({ name: 'disabled', type: 'bool', default: false })
  @Index()
  disabled: boolean;

  @Column({ name: "comment", type: 'varchar', nullable: true })
  comment: string | null;

  @Column({ name: "log", type: 'jsonb', nullable: true })
  log: BaseLogVo[] | null;
}

