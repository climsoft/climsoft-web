import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { StationEntity } from "./station.entity";  
import { SourceTemplateEntity } from "src/metadata/sources/entities/source-template.entity";

@Entity("station_forms")
export class StationFormEntity extends AppBaseEntity {

    @PrimaryColumn({ type: "varchar" ,name: "station_id"})
    stationId: string;

    // Note. 
    // This will always be a form source that's why form_id is used instead of source_id. 
    // To explicitly self document that it's not just any other source
    @PrimaryColumn({ type: "int", name:"form_id" })
    formId: number; 

    // ManyToOne relationship with StationEntity
    @ManyToOne(() => StationEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "station_id" })
    station: StationEntity;

    // ManyToOne relationship with SourceEntity
    @ManyToOne(() => SourceTemplateEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "form_id" })
    source: SourceTemplateEntity;
  
}
