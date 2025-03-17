import { ElementDomainEnum } from "./element-domain.enum";

export class ViewElementSubdomainDto {
    id: number;
    name: string;
    description: string | null;
    domain: ElementDomainEnum;
}