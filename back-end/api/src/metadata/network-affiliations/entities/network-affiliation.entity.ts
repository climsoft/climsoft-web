import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Check, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("network_affiliations")
@Check("CHK_network_affiliation_name_not_empty", `"name" <> ''`)
export class NetworkAffiliationEntity extends AppBaseEntity {
  @PrimaryGeneratedColumn({ name: "id" })
  id: number;

  @Column({ name: "name", type: 'varchar', unique: true })
  name: string;

  @Column({ name: "description", type: 'varchar', nullable: true })
  description: string | null;

  @Column({ name: "extra_metadata", type: 'jsonb', nullable: true })
  extraMetadata: string | null;

  @Column({ name: "comment", type: 'varchar', nullable: true })
  comment: string | null;

  @Column({ name: "log", type: 'jsonb', nullable: true })
  log: NetworkAffiliationLogVo[] | null;
}

export interface NetworkAffiliationLogVo extends BaseLogVo {
  name: string;
  description: string;
}