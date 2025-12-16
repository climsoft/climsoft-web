import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { FlagEnum } from "../enums/flag.enum";
import { QCStatusEnum } from "../enums/qc-status.enum";
import { AppBaseEntity, BaseLogVo } from "src/shared/entity/app-base-entity";
import { StationEntity } from "src/metadata/stations/entities/station.entity";
import { ElementEntity } from "src/metadata/elements/entities/element.entity";
import { SourceSpecificationEntity } from "src/metadata/source-templates/entities/source-specification.entity";

// TODO. Investigate if a constraints check for interval to always be greater than 0 is necessary
@Entity("observations")
@Check("CHK_observations_both_value_and_flag_not_null", `"value" IS NOT NULL OR "flag" IS NOT NULL`)
//@Check("CHK_observations_both_value_null_and_flag_missing", `"value" IS NULL AND "flag" IS 'missing'`) // TODO. Investigate if this check will ever be necessary before adding it. Flag settings may change within the preview rleases
//@Check("CHK_observations_no_future_dates", `"date_time" <= NOW()`) // TODO. Investigate why this is refusing current date
export class ObservationEntity extends AppBaseEntity {
  //------------------
  @PrimaryColumn({ name: "station_id", type: "varchar" })
  @Index()
  stationId: string;

  @ManyToOne(() => StationEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "station_id" })
  station: StationEntity;
  //------------------
  // ------------------
  @PrimaryColumn({ name: "element_id", type: "int" })
  @Index()
  elementId: number;

  @ManyToOne(() => ElementEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "element_id" })
  element: ElementEntity;
  //------------------

  /**
   * Level in reference to the nature of observation and element being observed e.g upper air, soil moisture. 
   */
  @PrimaryColumn({ name: "level", type: "int" })
  @Index()
  level: number;

  @PrimaryColumn({ name: "date_time", type: "timestamptz" })
  datetime: Date;

  @PrimaryColumn({ name: "interval", type: "int" })
  @Index()
  interval: number;

  //------------------
  @PrimaryColumn({ name: "source_id", type: "int" })
  @Index()
  sourceId: number;

  @ManyToOne(() => SourceSpecificationEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "source_id" })
  source: SourceSpecificationEntity;
  //------------------

  @Column({ name: "value", type: "float", nullable: true })
  value: number | null;

  @Column({ name: "flag", type: "enum", enum: FlagEnum, nullable: true })
  @Index()
  flag: FlagEnum | null;

  @Column({ name: "qc_status", type: "enum", enum: QCStatusEnum, default: QCStatusEnum.NONE })
  @Index()
  qcStatus: QCStatusEnum;

  @Column({ name: "qc_test_log", type: "jsonb", nullable: true })
  qcTestLog: QCTestLogVo[] | null;

  @Column({ name: "comment", type: "varchar", nullable: true })
  comment: string | null;

  @Column({ name: "deleted", type: "boolean", default: false })
  @Index()
  deleted: boolean;

  @Column({ name: "log", type: "jsonb", nullable: true })
  log: ObservationLogVo[] | null;

  // After full migration to v5 model, this column will no longer be needed.
  @Column({ name: "saved_to_v4", type: "boolean", default: false })
  @Index()
  savedToV4: boolean; // True when value has been uploaded to v4 database
}


export interface ObservationLogVo extends BaseLogVo {
  value: number | null;
  flag: FlagEnum | null;
  qcStatus: QCStatusEnum;
  comment: string | null;
  deleted: boolean;
}

export interface QCTestLogVo {
  qcTestId: number;
  qcStatus: QCStatusEnum;
}
