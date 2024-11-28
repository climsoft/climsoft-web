import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ElementTypeEntity } from "./element-type.entity";

@Entity("elements")
export class ElementEntity extends AppBaseEntity {
  @PrimaryColumn({ type: "int" })
  id: number;

  @Column({ type: "varchar", unique: true })
  abbreviation: string;

  @Column({ type: "varchar", unique: true })
  name: string;

  @Column({ type: "varchar" })
  description: string;

  @Column({ type: "varchar" })
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

  @Column({ type: "int", name: "entry_scale_factor", default: 0 })
  entryScaleFactor: number;

  @Column({ type: "varchar", nullable: true })
  comment: string | null;

  @Column({ type: "jsonb", nullable: true })
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