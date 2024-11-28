import { ElementDomainEnum } from "./element-domain.enum";

export interface ViewElementSubdomainDto {
    id: number;
    name: string;
    description: string;
    domain: ElementDomainEnum;
}