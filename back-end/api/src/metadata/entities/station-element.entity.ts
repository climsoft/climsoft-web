import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_station_elements")
export class StationElementEntity {

    @PrimaryColumn({ type: 'varchar' })
    stationId: string;

    @PrimaryColumn({ type: 'int' })
    elementId: number;

    @Column({ type: 'varchar', nullable: true })
    comment: string | null;
  
    @Column({ type: 'varchar' })
    entryUserId: string;

    @Column({ type: 'timestamptz', transformer: new DateTimeColumn() })
    entryDateTime: string;

    @Column({ type: 'json', nullable: true })
    log: string | null;

}