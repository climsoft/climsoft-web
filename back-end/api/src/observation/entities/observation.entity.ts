import { DateTimeColumn } from "src/shared/date-time-column.transformer";
import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("web_observations")
export class ObservationEntity {

  @PrimaryColumn({ type: 'varchar' })
  stationId: string;

  @PrimaryColumn({ type: 'int' })
  elementId: number;

  @PrimaryColumn({ type: 'int' })
  sourceId: number;

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

  @Column({ type: 'int' })
  entryUser: number;

  //todo. for consistency in date time storage. This should be set within the system instead of relying on typeorm
  //for instance typeorm will set the field to microseconds with precision of 6 which breaks consistency with how we store date time in other areas.
  //we also need the transformer to yeild consistent results
  @CreateDateColumn({ type: 'datetime', transformer: new DateTimeColumn() })
  entryDateTime: string;

  @Column({ type: 'json', nullable: true })
  log: string | null;

}