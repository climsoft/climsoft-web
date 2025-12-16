import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("integration_connectors")
@Check("CHK_integration_connectors_name_not_empty", `"name" <> ''`)
export class IntegrationConnectors extends AppBaseEntity {
  @PrimaryGeneratedColumn({ name: "id" })
  id: number;

  @Column({ name: 'name', type: 'varchar', unique: true })
  name: string;

  @Column({ name: "description", type: 'varchar', nullable: true })
  description: string | null;

  @Column({ name: "connector_type", type: 'varchar' })
  @Index()
  connectorType: 'import' | 'export';

  @Column({ name: "server_ip_address", type: 'varchar' })
  @Index()
  severIPAddress: string;

  @Column({ name: 'protocol', type: 'varchar' })
  @Index()
  protocol: 'http' | 'https' | 'ftp' | 'sftp'; // Note. All supported protocols assume that they are working with files

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


  // TODO. Add field(s) that best describes the cron patterns



  @Column({ name: 'specification_id', type: 'int' })  
  @Index()
  pecification_id: number;

  @Column({ name: "extra_metadata", type: 'jsonb', nullable: true })
  extraMetadata: any | null;

  @Column({ name: 'disabled', type: 'bool' })
  @Index()
  disabled: boolean;

  @Column({ name: "comment", type: 'varchar', nullable: true })
  comment: string | null;

  @Column({ name: "log", type: 'jsonb', nullable: true })
  log: any | null;
}

