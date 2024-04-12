import { BaseEntity, BaseLogVo } from "src/shared/entity/base-entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ElementTypeEntity } from "./element-type.entity";

@Entity("elements")
export class ElementEntity extends BaseEntity {
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

  @Column({ type: "int", name: "type_id" })
  typeId: number;

  @Column({ type: "int", name: "lower_limit", nullable: true })
  lowerLimit: number | null;

  @Column({ type: "int", name: "upper_limit", nullable: true })
  upperLimit: number | null;

  @Column({ type: "int", name: "entry_scale_factor", nullable: true })
  entryScaleFactor: number | null;

  @Column({ type: "varchar", nullable: true })
  comment: string | null;

  @Column({ type: "jsonb", nullable: true })
  log: ElementLogVo[] | null;

  // ManyToOne relationship with ElementTypeEntity
  @ManyToOne(() => ElementTypeEntity, {
    onDelete: "CASCADE",

    // Note, by default we expect most operations that relate to retrieving the elements to require the type as well.
    // Enabling eager loading here by default reduces boilerplate code needed to load them 'lazily'.
    // For operations that don't need the type loaded eagerly, just set it to false using typeorm when quering the entities
    eager: true,
  })
  @JoinColumn({ name: "type_id" })
  elementType: ElementTypeEntity;

}

export interface ElementLogVo extends BaseLogVo {
  abbreviation: string;
  name: string; 
  description: string; 
  units: string; 
  typeId: number;
  lowerLimit: number | null;
  upperLimit: number | null;
  entryScaleFactor: number | null;
  comment: string | null;
}