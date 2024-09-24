import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import { ElementDomainEnum } from "../dtos/elements/element-domain.enum";

@Entity("element_subdomains")
export class ElementSubdomainEntity {
    @PrimaryColumn({ type: "int" })
    id: number;

    @Column({ type: "varchar", unique: true })
    name: string;

    @Column({ type: "varchar"})
    description: string;

    @Column({ type: "enum", enum: ElementDomainEnum, name: "domain" })
    @Index()
    domain: ElementDomainEnum;

}
