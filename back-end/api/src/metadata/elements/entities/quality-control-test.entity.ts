import { BaseEntity, BaseLogVo } from "src/shared/entity/base-entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ElementEntity } from "./element.entity";
import { QualityControlTestTypeEnum } from "../enums/quality-control-test-type.enum";
import { QCTestParametersValidity } from "../dtos/quality-controls/create-quality-control-test.dto";

@Entity("quality_control_tests")
export class QualityControlTestEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "int" })
  id: number;

  @Column({ name: "qc_test_type_id", type: "enum", enum: QualityControlTestTypeEnum, })
  @Index()
  qcTestTypeId: QualityControlTestTypeEnum;

  //-----------------------
  @Column({ type: "int", name: "element_id" })
  elementId: number;

  // ManyToOne relationship with ElementTypeEntity
  @ManyToOne(() => ElementEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "element_id" })
  element: ElementEntity;
  //-----------------------

  @Column({ name: "period", type: "int", nullable: true })
  @Index()
  period: number | null;

  @Column({name:"parameters", type: "jsonb"})
  parameters: QCTestParametersValidity;

  @Column({ name: "disabled", type: "boolean", default: false })
  realTime: boolean ;

  @Column({ name: "disabled", type: "boolean", default: false })
  disabled: boolean ;

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