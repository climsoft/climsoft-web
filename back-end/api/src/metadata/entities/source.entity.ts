import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { SourceTypeEnum } from "../enums/source-type.enum";

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

    @Column({ type: "enum", enum: SourceTypeEnum, name: "source_type"})
    @Index()
    sourceType: SourceTypeEnum; 
}


