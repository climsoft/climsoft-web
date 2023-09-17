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

  @CreateDateColumn({ type: 'datetime' })
  entryDateTime?: Date;

}