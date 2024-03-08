export enum SourceTypeEnum {

    //Represents data entry through entry forms
    FORM = 1,

    // Denotes data that has been imported from external files
    IMPORT = 2,

    // Indicates Machine to Machine (M2M) communication as the data source
    DIGITAL = 3,
}

import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
@Entity("sources")
export class SourceEntity {
    @PrimaryGeneratedColumn({ type: "int" })
    id: number;

    @Column({ type: "varchar", unique: true })
    name: string;

    @Column({ type: "varchar" })
    description: string;

    @Column({ type: "jsonb", name: "extra_metadata", nullable: true })
    extraMetadata: string | null;

    @Column({ type: "enum", enum: SourceTypeEnum, name: "source_type_id", nullable: true })
    sourceTypeId: SourceTypeEnum | null; 

}


