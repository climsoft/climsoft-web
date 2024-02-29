

export enum SourceTypeEnum {

    //Represents data entry through entry forms
    FORM = 1, 
    
    // Denotes data that has been imported from external files
    IMPORT = 2, 

    // Indicates Machine to Machine (M2M) communication as the data source
    DIGITAL = 3, 
}

import { Column, Entity, PrimaryColumn } from "typeorm";
@Entity("sources")
export class SourceEntity {
    @PrimaryColumn({type: "int"})
    id: number;

    @Column({type: "varchar"})
    name: string;

    @Column({type: "varchar"})
    description: string;

    @Column({type: "jsonb", name:"extra_metadata", nullable: true })
    extraMetadata: string;

    @Column({  type: "enum", enum: SourceTypeEnum, name: "source_type_id", nullable: true })
    sourceTypeId: SourceTypeEnum; //we have changed

}


