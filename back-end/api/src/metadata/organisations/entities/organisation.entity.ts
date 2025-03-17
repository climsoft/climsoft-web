import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Check, Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity("organisations")
@Check("CHK_organisation_name_not_empty", `"name" <> ''`)
export class OrganisationEntity extends AppBaseEntity {
  @PrimaryGeneratedColumn({ name: "id", type: 'int' })
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
  log: OrganisationLogVo[] | null;
}

export interface OrganisationLogVo extends BaseLogVo {
  name: string;
  description: string;
}