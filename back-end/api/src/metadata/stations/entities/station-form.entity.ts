import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { StationEntity } from "./station.entity";  
import { SourceSpecificationEntity } from "src/metadata/source-templates/entities/source-specification.entity";

@Entity("station_forms")
export class StationFormEntity extends AppBaseEntity {
    @PrimaryColumn({ type: "varchar" ,name: "station_id"})
    @Index()
    stationId: string;

    
    // ManyToOne relationship with StationEntity
    @ManyToOne(() => StationEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "station_id" })
    station: StationEntity;

    // Note. 
    // This will always be a form source that's why form_id is used instead of source_id. 
    // To explicitly self document that it's not just any other source
    @PrimaryColumn({ type: "int", name:"form_id" })
    @Index()
    formId: number; 

    // ManyToOne relationship with SourceEntity
    @ManyToOne(() => SourceSpecificationEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "form_id" })
    form: SourceSpecificationEntity; 
}
