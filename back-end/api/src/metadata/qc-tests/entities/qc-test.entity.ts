import { ElementEntity } from "src/metadata/elements/entities/element.entity";
import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm"; 
import { QCTestTypeEnum } from "./qc-test-type.enum";
import { QCTestParametersValidity } from "../dtos/create-qc-test.dto";

@Entity("qc_tests")
@Check("CHK_qc_tests_name_not_empty", `"name" <> ''`)
export class QCTestEntity extends AppBaseEntity {
  @PrimaryGeneratedColumn({ type: "int" })
  id: number;

  @Column({ name: "name", type: "varchar", unique: true })
  name: string;

  @Column({ type: "varchar", nullable: true })
  description: string | null;

  //-----------------------
  @Column({ type: "int", name: "element_id" })
  @Index()
  elementId: number;

  // ManyToOne relationship with ElementTypeEntity
  @ManyToOne(() => ElementEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "element_id" })
  element: ElementEntity;
  //-----------------------

  @Column({ name: "observation_level", type: "int"})
  @Index()
  observationLevel: number;

  @Column({ name: "observation_interval", type: "int" })
  @Index()
  observationInterval: number;

  @Column({ name: "qc_test_type", type: "enum", enum: QCTestTypeEnum })
  @Index()
  qcTestType: QCTestTypeEnum;

  @Column({ name: "parameters", type: "jsonb" })
  parameters: QCTestParametersValidity;

  @Column({ name: "disabled", type: "boolean", default: false })
  @Index()
  disabled: boolean;

  @Column({ name: "comment", type: "varchar", nullable: true })
  comment: string | null;

  @Column({ name: "log", type: "jsonb", nullable: true })
  log: QualityControlLogVo[] | null;
}

export interface QualityControlLogVo extends BaseLogVo {
  elementId: number;
  level: number;
  interval: number;
  qcTypeId: string;
  parameters: string;
  comment: string | null;
}