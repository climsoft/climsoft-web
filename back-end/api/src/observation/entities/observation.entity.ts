import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { FlagEnum } from "../enums/flag.enum";
import { QCStatusEnum } from "../enums/qc-status.enum";
import { BaseEntity, BaseLogVo } from "src/shared/entity/base-entity";
import { StationEntity } from "src/metadata/stations/entities/station.entity";
import { ElementEntity } from "src/metadata/elements/entities/element.entity"; 
import { SourceEntity } from "src/metadata/sources/entities/source.entity";

@Entity("observations")
export class ObservationEntity extends BaseEntity {

  @PrimaryColumn({ name: "station_id", type: "varchar" })
  stationId: string;

  @PrimaryColumn({ name: "element_id", type: "int" })
  elementId: number;

  @PrimaryColumn({ name: "source_id", type: "int" })
  sourceId: number;

  /**
   * Elevation in reference to the station surface. 
   * Can above or below the station surface depending on the element.
   */
  @PrimaryColumn({ name: "elevation", type: "float" })
  elevation: number;

  @PrimaryColumn({ name: "date_time", type: "timestamptz" })
  datetime: Date;

  @PrimaryColumn({ name: "period", type: "int" })
  period: number;

  @Column({ name: "value", type: "float", nullable: true })
  value: number | null;

  @Column({ name: "flag", type: "enum", enum: FlagEnum, nullable: true })
  flag: FlagEnum | null;

  @Column({ name: "qc_status", type: "enum", enum: QCStatusEnum, default: QCStatusEnum.NO_QC_TESTS_DONE })
  @Index()
  qcStatus: QCStatusEnum;

  @Column({ name: "qc_test_log", type: "jsonb", nullable: true })
  qcTestLog: string | null;

  @Column({ name: "final", type: "boolean", default: false })
  @Index()
  final: boolean;

  @Column({ name: "comment", type: "varchar", nullable: true })
  comment: string | null;

  @Column({ name: "deleted", type: "boolean", default: false })
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