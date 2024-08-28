import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ElementEntity } from "./element.entity";
import { QCTestTypeEnum } from "./qc-test-type.enum";
import { QCTestParametersValidity } from "../dtos/qc-tests/create-qc-test.dto";

@Entity("quality_control_tests")
export class QCTestEntity extends AppBaseEntity {
  @PrimaryGeneratedColumn({ type: "int" })
  id: number;

  @Column({ name: "qc_test_type", type: "enum", enum: QCTestTypeEnum, })
  @Index()
  qcTestType: QCTestTypeEnum;

  //-----------------------
  @Column({ type: "int", name: "element_id" })
  elementId: number;

  // ManyToOne relationship with ElementTypeEntity
  @ManyToOne(() => ElementEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "element_id" })
  element: ElementEntity;
  //-----------------------

  @Column({ name: "observation_period", type: "int", nullable: true })
  @Index()
  observationPeriod: number | null;

  @Column({ name: "parameters", type: "jsonb" })
  parameters: QCTestParametersValidity;

  @Column({ name: "real_time", type: "boolean", default: false })
  realTime: boolean;

  @Column({ name: "disabled", type: "boolean", default: false })
  disabled: boolean;

  @Column({ name: "comment", type: "varchar", nullable: true })
  comment: string | null;

  @Column({ name: "log", type: "jsonb", nullable: true })
  log: QualityControlLogVo[] | null;
}

export interface QualityControlLogVo extends BaseLogVo {
  qcTypeId: string;
  elementId: number;
  period: number | null;
  formulaValues: string;
  comment: string | null;
}