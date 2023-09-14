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

  @PrimaryColumn()
  datetime: Date;

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

  @CreateDateColumn({type: 'datetime'})
  entryDateTime?: Date;

}