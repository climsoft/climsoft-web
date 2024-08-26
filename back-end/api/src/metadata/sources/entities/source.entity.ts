import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm"; 
import { SourceTypeEnum } from "src/metadata/sources/enums/source-type.enum";
import { SourceDefinitionValidity } from "../dtos/create-update-source.dto";

@Entity("sources")
export class SourceEntity {
    @PrimaryGeneratedColumn({  name: "id", type: "int" })
    id: number;

    @Column({  name: "name", type: "varchar", unique: true })
    name: string;

    @Column({ name: "description", type: "varchar" })
    description: string;

    @Column({name: "source_type", type: "enum", enum: SourceTypeEnum})
    @Index()
    sourceType: SourceTypeEnum; 

    @Column({name: "utc_offset", type: "int" })
    utcOffset: number;

    @Column({name: "allow_missing_value", type: "boolean" })
    allowMissingValue: boolean;

    @Column({name: "sample_image", type: "varchar" })
    sampleImage: string;

    @Column({  name: "definitions", type: "jsonb"})
    definitions: SourceDefinitionValidity ;
}


