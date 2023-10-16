import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("web_source_types")
export class SourceTypeEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    description: string;

}