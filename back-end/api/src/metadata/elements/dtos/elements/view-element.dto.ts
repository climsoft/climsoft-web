import { ElementDomainEnum } from "./element-domain.enum";
export class ViewElementDto {
    id: number;
    name: string;
    abbreviation: string;
    description: string;
    units: string;
    typeId: number;
    typeName: string;
    //subdomainName: string;
    //domain: ElementDomainEnum;
    entryScaleFactor: number;
    comment: string | null;
}