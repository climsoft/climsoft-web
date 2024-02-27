import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("element_domains")
export class ElementDomainEntity {
    @PrimaryColumn({ type: "int" })
    id: number;
  
    @Column({ type: "varchar" })
    name: string;

    @Column({ type: "varchar" })
    description: string;
}
