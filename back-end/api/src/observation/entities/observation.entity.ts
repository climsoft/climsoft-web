import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { FlagEnum } from "../enums/flag.enum";
import { QCStatusEnum } from "../enums/qc-status.enum";
import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { StationEntity } from "src/metadata/stations/entities/station.entity";
import { ElementEntity } from "src/metadata/elements/entities/element.entity";
import { SourceTemplateEntity } from "src/metadata/sources/entities/source-template.entity";

@Entity("observations")
@Check("CHK_observations_both_value_and_flag_not_null", `"value" IS NOT NULL OR "flag" IS NOT NULL`)
@Check("CHK_observations_no_future_dates", `"date_time" <= NOW()`)
export class ObservationEntity extends AppBaseEntity {
  // ------------------
  @PrimaryColumn({ name: "station_id", type: "varchar" })
  @Index()
  stationId: string;

  @ManyToOne(() => StationEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "station_id" })
  station: StationEntity;
  // ------------------
  // ------------------
  @PrimaryColumn({ name: "element_id", type: "int" })
  @Index()
  elementId: number;

  @ManyToOne(() => ElementEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "element_id" })
  element: ElementEntity;
  // ------------------

  /**
   * Level in reference to the nature of observation and element being observed e.g upper air, soil moisture. 
   */
  @PrimaryColumn({ name: "level", type: "float" })
  @Index()
  level: number;

  @PrimaryColumn({ name: "date_time", type: "timestamptz" })
  datetime: Date;

  @PrimaryColumn({ name: "interval", type: "int" })
  @Index()
  interval: number;

  // ------------------
  @PrimaryColumn({ name: "source_id", type: "int" })
  @Index()
  sourceId: number;

  @ManyToOne(() => SourceTemplateEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "source_id" })
  source: SourceTemplateEntity;
  // ------------------

  @Column({ name: "value", type: "float", nullable: true })
  value: number | null;

  @Column({ name: "flag", type: "enum", enum: FlagEnum, nullable: true })
  @Index()
  flag: FlagEnum | null;

  @Column({ name: "qc_status", type: "enum", enum: QCStatusEnum, default: QCStatusEnum.NONE })
  @Index()
  qcStatus: QCStatusEnum;

  @Column({ name: "qc_test_log", type: "jsonb", nullable: true })
  qcTestLog: QCTestLogVo | null; // TODO Index the test logs

  @Column({ name: "comment", type: "varchar", nullable: true })
  comment: string | null;

  @Column({ name: "deleted", type: "boolean", default: false })
  @Index()
  deleted: boolean;

  @Column({ name: "log", type: "jsonb", nullable: true })
  log: UpdateObservationValuesLogVo[] | null;

  // After full migration to v5 model, this column will no longer be needed.
  @Column({ name: "saved_to_v4", type: "boolean", default: false })
  @Index()
  savedToV4: boolean; // True when value has been uploaded to v4 database
}

//when changing qc, we will use the qc log
export interface UpdateObservationValuesLogVo extends BaseLogVo {
  value: number | null;
  flag: FlagEnum | null;
  comment: string | null;
  deleted: boolean;
}

export class ViewObservationLogDto {
  value: number | null;
  flag: FlagEnum | null;
  comment: string | null;
  deleted: boolean;
  entryUserEmail: string;
  entryDateTime: string;
}

export interface QCTestLogVo {
  qc_id: number;
  enforcedBy?: number;
  enforcedDate?: Date;
}