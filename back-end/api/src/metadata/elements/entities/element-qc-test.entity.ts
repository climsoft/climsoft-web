import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ElementEntity } from "./element.entity";
import { QCTestTypeEnum } from "./qc-test-type.enum";
import { QCTestParametersValidity } from "../dtos/qc-tests/create-element-qc-test.dto";

@Entity("elements_qc_tests")
@Check("CHK_elements_qc_test_name_not_empty", `"name" <> ''`)
export class ElementQCTestEntity extends AppBaseEntity {
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

  // TODO. 16/06/2025. Remove nullable after qc tests are upgraded in MSD and Demo installations.
  // observation level should never be null.
  @Column({ name: "observation_level", type: "int", nullable: true })
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