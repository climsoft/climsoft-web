import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Check, Column, Entity, PrimaryColumn } from "typeorm";


@Entity("organisations")
@Check("CHK_organisation_name_not_empty", `"name" <> ''`)
export class OrganisationEntity extends AppBaseEntity {
  @PrimaryColumn({ name: "id", type: 'varchar' })
  id: string;

  @Column({ name: "name", type: 'varchar', unique: true })
  name: string;

  @Column({ name: "description", type: 'varchar' })
  description: string;

  @Column({ name: "extra_metadata", type: 'jsonb' })
  extraMetadata: string;

  @Column({ name: "comment", type: 'varchar', nullable: true })
  comment: string | null;

  @Column({ name: "log", type: 'jsonb', nullable: true })
  log: OrganisationLogVo[] | null;
}

export interface OrganisationLogVo extends BaseLogVo {
  name: string;
  description: string; 
}