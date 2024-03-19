import { Column, Entity, Index,  PrimaryColumn } from "typeorm"; 
import { DomainEnum } from "../enums/domain.enum"; 

@Entity("element_subdomains")
export class ElementSubdomainEntity {
    @PrimaryColumn({ type: "int" })
    id: number;

    @Column({ type: "varchar", unique: true })
    name: string;

    @Column({ type: "enum", enum: DomainEnum, name: "domain"})
    @Index()
    domain: DomainEnum;


}
