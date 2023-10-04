import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_station_forms")
export class StationFormEntity {

    @PrimaryColumn({ type: 'varchar' })
    stationId: string;

    @PrimaryColumn({ type: 'int' })
    sourceId: number;

    @Column({ type: 'varchar', nullable: true })
    comment: string | null;
  
    @Column({ type: 'int' })
    entryUser: number;

    @Column({ type: 'datetime', transformer: new DateTimeColumn() })
    entryDateTime: string;

    @Column({ type: 'json', nullable: true })
    log: string | null;

}

export interface StationFormLogVo {
    comment: string | null;
    entryUser: number;
    entryDateTime: string;  
  }