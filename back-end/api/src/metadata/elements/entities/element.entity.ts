import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ElementTypeEntity } from "./element-type.entity";

@Entity("elements")
export class ElementEntity extends AppBaseEntity {
  @PrimaryColumn({ type: "int" })
  id: number;

  @Column({ type: "varchar", name: "abbreviation", unique: true })
  abbreviation: string;

  @Column({ type: "varchar", name: "name", unique: true })
  name: string;

  @Column({ type: "varchar", name: "description", nullable: true })
  description: string | null;

  @Column({ type: "varchar", name: "units" })
  units: string;

  //---------------------------
  // TODO. Call this column, element_type_id?
  @Column({ type: "int", name: "type_id" })
  typeId: number;
  // ManyToOne relationship with ElementTypeEntity
  @ManyToOne(() => ElementTypeEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "type_id" })
  elementType: ElementTypeEntity;
  //---------------------------

  @Column({ type: "int", name: "entry_scale_factor", nullable: true })
  entryScaleFactor: number | null;

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