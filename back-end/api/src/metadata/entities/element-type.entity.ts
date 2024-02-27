import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("element_types")
export class ElementTypeEntity {
    @PrimaryColumn({ type: "int" })
    id: number;

    @Column({ type: "varchar" })
    name: string;

    @Column({ type: "varchar" })
    description: string;

    @Column({ type: "int", name: "subdomain_id" })
    subdomainId: number;
}
