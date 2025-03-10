import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ElementTypeEntity } from "./element-type.entity";

@Entity("elements")
@Check("CHK_elements_abbreviation_not_empty", `"abbreviation" <> ''`)
@Check("CHK_elements_name_not_empty", `"name" <> ''`)
export class ElementEntity extends AppBaseEntity {
  @PrimaryColumn({ type: "int" })
  id: number;

  @Column({ type: "varchar", name: "abbreviation", unique: true })
  abbreviation: string;

  @Column({ type: "varchar", name: "name", unique: true })
  name: string;

  @Column({ type: "varchar", name: "description", nullable: true })
  description: string | null;

  @Column({ type: "varchar", name: "units" , nullable: true })
  units: string;

  //---------------------------
  @Column({ type: "int", name: "type_id" })
   @Index()
  typeId: number;
  // ManyToOne relationship with ElementTypeEntity
  @ManyToOne(() => ElementTypeEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "type_id" })
  elementType: ElementTypeEntity;
  //---------------------------

  @Column({ type: "int", name: "entry_scale_factor", nullable: true })
  entryScaleFactor: number | null;

  @Column({ type: "boolean", name: "total_entry_required", nullable: true })
  totalEntryRequired: boolean | null;

  @Column({ type: "varchar", name: "comment", nullable: true })
  comment: string | null;

  @Column({ type: "jsonb", name: "log", nullable: true })
  log: ElementLogVo[] | null;
}

export interface ElementLogVo extends BaseLogVo {
  abbreviation: string;
  name: string;
  description: string;
  units: string;
  typeId: number;
  entryScaleFactor: number | null;
  comment: string | null;
}