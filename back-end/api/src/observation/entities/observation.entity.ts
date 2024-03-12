import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import { FlagEnum } from "../enums/flag.enum";
import { QCStatusEnum } from "../enums/qc-status.enum";
import { BaseEntity, BaseLogVo } from "src/shared/entity/base-entity";

@Entity("observations")
export class ObservationEntity extends BaseEntity{

  @PrimaryColumn({ type: "varchar" })
  stationId: string;

  @PrimaryColumn({ type: "int" })
  elementId: number;

  @PrimaryColumn({ type: "int" })
  sourceId: number;

  @PrimaryColumn({ type: "float" })
  elevation: number;

  //@PrimaryColumn({ type: "timestamptz", name: "date_time", transformer: new DateTimeColumn() })
  //datetime: string;

  @PrimaryColumn({ type: "timestamptz", name: "date_time" })
  datetime: Date;

  @PrimaryColumn({ type: "int" })
  period: number;

  @Column({ type: "float", nullable: true })
  value: number | null;

  @Column({ type: "enum", enum: FlagEnum, nullable: true })
  flag: FlagEnum | null;

  @Column({ type: "enum", enum: QCStatusEnum, default: QCStatusEnum.NoQCTestsDone, name: "qc_status" })
  @Index()
  qcStatus: QCStatusEnum; 

  @Column({ type: "json", nullable: true, name: "qc_test_log" })
  qcTestLog: string | null;

  @Column({ type: "boolean", default: false })
  @Index()
  final: boolean;

  @Column({ type: "varchar", nullable: true })
  comment: string | null;

  @Column({ type: "boolean", default: false })
  @Index()
  deleted: boolean;

  @Column({ type: "jsonb", nullable: true })
  log: UpdateObservationValuesLogVo[] | null;

}

//when changing qc, we will use the qc log
export interface UpdateObservationValuesLogVo extends BaseLogVo {
  value: number | null;
  flag: FlagEnum | null;
  final: boolean;
  comment: string | null; 
  deleted: boolean; 
}