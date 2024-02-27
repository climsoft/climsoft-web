import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { Flag } from "../enums/flag.enum";
import { QCStatus } from "../enums/qc-status.enum";

@Entity("observations")
export class ObservationEntity {

  @PrimaryColumn({ type: "varchar" })
  stationId: string;

  @PrimaryColumn({ type: "int" })
  elementId: number;

  @PrimaryColumn({ type: "int" })
  sourceId: number;

  @PrimaryColumn({ type: "float" })
  elevation: number;

  @PrimaryColumn({ type: "timestamptz", name: "date_time", transformer: new DateTimeColumn() })
  datetime: string;

  @PrimaryColumn({ type: "int" })
  period: number;

  @Column({ type: "float", nullable: true })
  value: number | null;

  @Column({ type: "enum", enum: Flag, nullable: true })
  flag: Flag | null;

  @Column({ type: "enum", enum: QCStatus, default: QCStatus.NoQCTestsDone, name: "qc_status" })
  qcStatus: QCStatus;

  @Column({ type: "json", nullable: true, name: "qc_test_log" })
  qcTestLog: string | null;

  @Column({ type: "boolean", default: false })
  final: boolean;

  @Column({ type: "varchar", nullable: true })
  comment: string | null;

  @Column({ type: "boolean", default: false })
  deleted: boolean;

  @Column({ type: "int", name: "entry_user_id" })
  entryUserId: number;

  @Column({ type: "timestamptz", name: "entry_date_time", transformer: new DateTimeColumn() })
  entryDateTime: string;

  @Column({ type: "jsonb", nullable: true })
  log: ObservationLogVo[] | null;

}

export interface ObservationLogVo {
  period: number;
  value: number | null;
  flag: Flag | null;
  qcStatus: QCStatus;
  final: boolean;
  comment: string | null;
  entryUserId: number;
  deleted: boolean;
  entryDateTime: string;
}