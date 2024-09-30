import { CreateElementModel } from "./create-element.model";
import { ElementDomainEnum } from "./element-domain.enum";

export interface ViewElementModel extends CreateElementModel{
  typeId: number;
  typeName: string;
  subdomainName: string;
  domain: ElementDomainEnum;
  entryScaleFactor: number;
  comment: string | null; 
}