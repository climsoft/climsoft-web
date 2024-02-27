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

    @Column({type: "int", name: "source_type_id"})
    sourceTypeId: number;

}