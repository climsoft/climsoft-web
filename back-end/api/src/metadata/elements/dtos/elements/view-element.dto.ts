import { ElementDomainEnum } from "./element-domain.enum";


export class ViewElementDto {
    id: number;
    name: string;
    abbreviation: string;
    description: string;
    units: string;
    typeId: number;
    typeName: string;
    subdomainName: string;
    domain: ElementDomainEnum;
    lowerLimit: number | null;
    upperLimit: number | null;
    entryScaleFactor: number | null;
    comment: string | null;
}