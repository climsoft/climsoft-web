import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("web_element_domains")
export class DomainEntity {
    @PrimaryColumn({ type: 'int' })
    id: number;
  
    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'varchar' })
    description: string;
}