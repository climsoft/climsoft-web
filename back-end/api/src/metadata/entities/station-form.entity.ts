import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_station_forms")
export class StationFormEntity {

    @PrimaryColumn({ type: 'varchar' })
    stationId: string;

    @PrimaryColumn({ type: 'int' })
    sourceId: number;
  
    @Column({ type: 'varchar' })
    entryUserId: string;

    @Column({ type: 'timestamptz', transformer: new DateTimeColumn() })
    entryDateTime: string;
}
