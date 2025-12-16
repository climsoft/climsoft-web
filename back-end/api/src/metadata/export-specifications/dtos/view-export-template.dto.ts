import { ExportTypeEnum } from "../enums/export-type.enum";
import { ExportTemplateParametersDto } from "./export-template-paramers.dto";

export class ViewTemplateExportDto {
  id: number;
  name: string;
  description: string;
  exportType: ExportTypeEnum;
  parameters: ExportTemplateParametersDto; //TODO. Implement validations
  disabled: boolean;
  comment: string | null;
}
