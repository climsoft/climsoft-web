import { DateTimeColumn } from "src/shared/date-time-column.transformer";
import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("web_observations")
export class ObservationEntity {

  @PrimaryColumn()
  stationId: string;

  @PrimaryColumn()
  elementId: number;

  @PrimaryColumn()
  sourceId: number;

  @PrimaryColumn()
  level: string;

  @PrimaryColumn({ type: 'datetime', transformer: new DateTimeColumn() })
  datetime: string;

  @Column()
  period: number;

  @Column({ nullable: true })
  value: number;

  @Column({ nullable: true })
  flag: string;

  @Column()
  qcStatus: number;

  @Column()
  entryUser: number

  //todo. for consistency in date time storage. This should be set within the system instead of relying on typeorm
  // for instance typeorm will set the field to microseconds with precision of 6 which breaks consistency with how we store date time in other areas.
  //we also need the transformer to yeild consistent results
  @CreateDateColumn({ type: 'datetime', transformer: new DateTimeColumn() })
  entryDateTime: string;

}