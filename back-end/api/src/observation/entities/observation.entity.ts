import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_observations")
export class ObservationEntity {

  @PrimaryColumn({ type: 'varchar' })
  stationId: string;

  @PrimaryColumn({ type: 'int' })
  elementId: number;

  @PrimaryColumn({ type: 'int' })
  sourceId: number;

  @PrimaryColumn({ type: 'varchar', default: 'unknown' })
  instrumentId: string;

  @PrimaryColumn({ type: 'varchar' })
  level: string;

  @PrimaryColumn({ type: 'datetime', transformer: new DateTimeColumn() })
  datetime: string;

  @Column({ type: 'int' })
  period: number;

  @Column({ type: 'float', nullable: true })
  value: number | null;

  @Column({ type: 'int', nullable: true })
  flag: number | null;

  @Column({ type: 'int' })
  qcStatus: number;

  @Column({ type: 'varchar', nullable: true })
  comment: string | null;

  @Column({ type: 'varchar' })
  entryUserId: string;

  //for consistency in date time storage. This should be set at application level instead of relying on typeorm and database
  //for instance typeorm will set the field to microseconds with precision of 6 which breaks consistency with how we store date time in other areas.
  //we also need the transformer to yield consistent results
  //there could also be inconsistency if typeorm ended up using different timezone
  @Column({ type: 'datetime', transformer: new DateTimeColumn() })
  entryDateTime: string;

  //maps to observation log model
  @Column({ type: 'json', nullable: true })
  log: string | null;

}

export interface ObservationLogVo {
  period: number;
  value: number | null;
  flag: number | null;
  qcStatus: number;
  comment: string | null;
  entryUserId: string;
  entryDateTime: string;
}