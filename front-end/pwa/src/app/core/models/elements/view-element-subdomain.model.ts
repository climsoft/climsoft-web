import { ElementDomainEnum } from "./element-domain.enum";

export interface ViewElementSubdomainModel {
    id: number;
    name: string;
    description: string;
    domain: ElementDomainEnum;
}