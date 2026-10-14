import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Check, Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ConnectorTypeEnum, ServerTypeEnum, StoredConnectorParameters } from "../dtos/create-connector-specification.dto";
import { ConnectorSpecificationBindingEntity } from "./connector-specification-binding.entity";

@Entity("connector_specifications")
@Check("CHK_connector_specifications_name_not_empty", `"name" <> ''`)
export class ConnectorSpecificationEntity extends AppBaseEntity {
  @PrimaryGeneratedColumn({ name: "id" })
  id!: number;

  @Column({ name: 'name', type: 'varchar', unique: true })
  name!: string;

  @Column({ name: 'description', type: 'varchar' })
  description!: string;

  @Column({ name: 'connector_type', type: 'enum', enum: ConnectorTypeEnum })
  @Index()
  connectorType!: ConnectorTypeEnum;

  @Column({ name: 'server_type', type: 'enum', enum: ServerTypeEnum })
  @Index()
  serverType!: ServerTypeEnum;

  @Column({ name: 'host_name', type: 'varchar' })
  hostName!: string;

  @Column({ name: 'timeout', type: 'int' })
  timeout!: number; // in seconds

  @Column({ name: 'retry_attempts', type: "int" })
  retryAttempts!: number;

  @Column({ name: 'cron_schedule', type: 'varchar' })
  cronSchedule!: string; // Cron pattern (e.g., '0 2 * * *' for 2 AM daily)

  /**
   * Connection settings only — protocol, port, credentials, remote path, and an
   * export's observation window.
   *
   * The bindings list that used to sit in here under `specifications` is now
   * `connector_specification_bindings`, because a binding needs an id of its
   * own for the run tiers to key on. See ConnectorSpecificationBindingEntity
   * for why, and StoredConnectorParameters for what stayed. The API still
   * carries the list nested under `parameters.specifications` in both
   * directions; only storage changed.
   */
  @Column({ name: "parameters", type: 'jsonb' })
  parameters!: StoredConnectorParameters;

  @OneToMany(() => ConnectorSpecificationBindingEntity, binding => binding.connectorSpecification)
  bindings!: ConnectorSpecificationBindingEntity[];

  @Column({ name: 'disabled', type: 'bool', default: false })
  @Index()
  disabled!: boolean;

  @Column({ name: "comment", type: 'varchar', nullable: true })
  comment!: string | null;

  @Column({ name: "log", type: 'jsonb', nullable: true })
  log!: BaseLogVo[] | null;
}