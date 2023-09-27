import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_station_sources")
export class StationSourceEntity {

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