import { ElementDomainEnum } from "src/app/metadata/elements/models/element-domain.enum";

export interface ViewElementSubdomainModel {
    id: number;
    name: string;
    description: string;
    domain: ElementDomainEnum;
}