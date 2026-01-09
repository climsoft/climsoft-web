import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { ConnectorParameters, ConnectorTypeEnum, EndPointTypeEnum } from "../dtos/create-connector-specification.dto";

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

  @Column({ name: 'protocol', type: 'enum', enum: EndPointTypeEnum })
  @Index()
  endPointType: EndPointTypeEnum;

  @Column({ name: 'host_name', type: 'varchar' })
  hostName: string;

  @Column({ name: 'timeout', type: 'int' })
  timeout: number; // in seconds

  @Column({ name: "maximum_retries", type: "int" })
  maximumRetries: number;

  @Column({ name: 'cron_schedule', type: 'varchar' })
  cronSchedule: string; // Cron pattern (e.g., '0 2 * * *' for 2 AM daily)

  @Column({ name: "parameters", type: 'jsonb' })
  parameters: ConnectorParameters;

  @Column({ name: "order_number", type: "int", nullable: true })
  @Index()
  orderNumber: number | null;

  @Column({ name: 'disabled', type: 'bool', default: false })
  @Index()
  disabled: boolean;

  @Column({ name: "comment", type: 'varchar', nullable: true })
  comment: string | null;

  @Column({ name: "log", type: 'jsonb', nullable: true })
  log: BaseLogVo[] | null;
}
