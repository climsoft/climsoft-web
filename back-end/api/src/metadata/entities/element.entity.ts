import { BaseEntity, BaseLogVo } from "src/shared/entity/base-entity";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("elements")
export class ElementEntity extends BaseEntity {
  @PrimaryColumn({ type: "int" })
  id: number;

  @Column({ type: "varchar", unique: true })
  name: string;

  @Column({ type: "varchar", unique: true })
  abbreviation: string;

  @Column({ type: "varchar" })
  description: string;

  @Column({ type: "int", name: "type_id" })
  typeId: number;

  @Column({ type: "int", name: "lower_limit", nullable: true })
  lowerLimit: number | null;

  @Column({ type: "int", name: "upper_limit", nullable: true })
  upperLimit: number | null;

  @Column({ type: "float", name: "entry_scale_factor", nullable: true })
  entryScaleFactor: number | null;

  @Column({ type: "varchar", nullable: true })
  comment: string | null;

  @Column({ type: "jsonb", nullable: true })
  log: ElementLogVo[] | null;

}

export interface ElementLogVo extends BaseLogVo {
  name: string;
  abbreviation: string;
  description: string;
  typeId: number;
  lowerLimit: number | null;
  upperLimit: number | null;
  entryScaleFactor: number | null;
  comment: string | null;
}