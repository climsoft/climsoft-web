import { ElementEntity } from "src/metadata/elements/entities/element.entity";
import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm"; 
import { QCTestTypeEnum } from "./qc-test-type.enum";
import { RangeThresholdQCTestParamsDto } from "../dtos/qc-test-parameters/range-qc-test-params.dto"; 
import { SpikeQCTestParamsDto } from "../dtos/qc-test-parameters/spike-qc-test-params.dto";
import { RelationalQCTestParamsDto } from "../dtos/qc-test-parameters/relational-qc-test-params.dto";
import { DiurnalQCTestParamsDto } from "../dtos/qc-test-parameters/diurnal-qc-test-params.dto";
import { ContextualQCTestParamsDto } from "../dtos/qc-test-parameters/contextual-qc-test-params.dto";
import { RemoteSensingQCTestParamsDto } from "../dtos/qc-test-parameters/remote-sensing-qc-test-params.dto";
import { SpatialQCTestParamsDto } from "../dtos/qc-test-parameters/spatial-qc-test-params.dto";
import { FlatLineQCTestParamsDto } from "../dtos/qc-test-parameters/flat-line-qc-test-params.dto";

export type QCTestParameters = RangeThresholdQCTestParamsDto | FlatLineQCTestParamsDto | SpikeQCTestParamsDto | RelationalQCTestParamsDto | DiurnalQCTestParamsDto | ContextualQCTestParamsDto | RemoteSensingQCTestParamsDto | SpatialQCTestParamsDto;

@Entity("qc_tests") // TODO. Rename this to qc_specifications  
@Check("CHK_qc_tests_name_not_empty", `"name" <> ''`)// TODO. rename this also 
export class QCSpecificationEntity extends AppBaseEntity {
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
  parameters: QCTestParameters;

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