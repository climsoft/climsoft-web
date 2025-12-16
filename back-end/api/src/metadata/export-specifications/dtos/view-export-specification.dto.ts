import { ExportTypeEnum } from "../enums/export-type.enum";
import { ExportSpecificationParametersDto } from "./export-specification-parameters.dto";

export class ViewSpecificationExportDto {
  id: number;
  name: string;
  description: string;
  exportType: ExportTypeEnum;
  parameters: ExportSpecificationParametersDto; //TODO. Implement validations
  disabled: boolean;
  comment: string | null;
}
