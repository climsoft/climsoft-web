import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Check, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("flags")
@Check("CHK_flag_abbreviation_not_empty", `"abbreviation" <> ''`)
@Check("CHK_flag_name_not_empty", `"name" <> ''`)
export class FlagEntity extends AppBaseEntity {
  @PrimaryGeneratedColumn({ name: "id", type: 'int' })
  id!: number;

  @Column({ name: "abbreviation", type: 'varchar', unique: true })
  abbreviation!: string;

  @Column({ name: "name", type: 'varchar', unique: true })
  name!: string;

  @Column({ name: "description", type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ name: "comment", type: 'varchar', nullable: true })
  comment!: string | null;

  @Column({ name: "log", type: 'jsonb', nullable: true })
  log!: FlagLogVo[] | null;
}

export interface FlagLogVo extends BaseLogVo {
  abbreviation: string;
  name: string;
  description: string | null;
  comment: string | null;
}
