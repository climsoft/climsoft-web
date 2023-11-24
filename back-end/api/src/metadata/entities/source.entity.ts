import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("web_sources")
export class SourceEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    description: string;

    @Column('json', { nullable: true })
    extraMetadata: string;

    @Column()
    sourceTypeId: number;

}