import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_element_subdomains")
export class ElementSubdomainEntity {
    @PrimaryColumn({ type: 'int' })
    id: number;
  
    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'varchar' })
    description: string;

    @Column({ type: 'int' })
    domainId: number
}