import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { FlagEnum } from "../enums/flag.enum";
import { QCStatusEnum } from "../enums/qc-status.enum";
import { BaseEntity, BaseLogVo } from "src/shared/entity/base-entity";
import { StationEntity } from "src/metadata/entities/station.entity";
import { ElementEntity } from "src/metadata/entities/element.entity";
import { SourceEntity } from "src/metadata/entities/source.entity";

@Entity("observations")
export class ObservationEntity extends BaseEntity {

  @PrimaryColumn({ type: "varchar", name: "station_id" })
  stationId: string;

  @PrimaryColumn({ type: "int", name: "element_id" })
  elementId: number;

  @PrimaryColumn({ type: "int", name: "source_id" })
  sourceId: number;

  @PrimaryColumn({ type: "float" })
  elevation: number;

  @PrimaryColumn({ type: "timestamptz", name: "date_time" })
  datetime: Date;

  @PrimaryColumn({ type: "int" })
  period: number;

  @Column({ type: "float", nullable: true })
  value: number | null;

  @Column({ type: "enum", enum: FlagEnum, nullable: true })
  flag: FlagEnum | null;

  @Column({ type: "enum", enum: QCStatusEnum, default: QCStatusEnum.NO_QC_TESTS_DONE, name: "qc_status" })
  @Index()
  qcStatus: QCStatusEnum;

  @Column({ type: "jsonb", nullable: true, name: "qc_test_log" })
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

  // Relationships

  @ManyToOne(() => StationEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "station_id" })
  station: StationEntity;

  @ManyToOne(() => ElementEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "element_id" })
  element: ElementEntity;

  @ManyToOne(() => SourceEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "source_id" })
  source: SourceEntity;

}

//when changing qc, we will use the qc log
export interface UpdateObservationValuesLogVo extends BaseLogVo {
  value: number | null;
  flag: FlagEnum | null;
  final: boolean;
  comment: string | null;
  deleted: boolean;
}