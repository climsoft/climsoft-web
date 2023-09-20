import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_flags")
export class FlagEntity {
    @PrimaryColumn()
    id: number;
    
    @Column()
    name: string;

    @Column()
    description: string;

}