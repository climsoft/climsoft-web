import { DateTimeColumn } from "src/shared/column-transformers/date-time-column.transformer";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("station_forms")
export class StationFormEntity {

    @PrimaryColumn({ type: "varchar" })
    stationId: string;

    @PrimaryColumn({ type: "int" })
    sourceId: number;
  
    @Column({ type: "varchar", name: "entry_user_id" })
    entryUserId: string;

    @Column({ type: "timestamptz", name: "entry_date_time", transformer: new DateTimeColumn() })
    entryDateTime: string;
}
