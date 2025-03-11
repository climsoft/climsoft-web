import { ExportTemplateParametersDto } from "./export-template-paramers.dto";

export class ViewTemplateExportDto {
  id: number;
  name: string;
  description: string;
  parameters: ExportTemplateParametersDto; //TODO. Implement validations
  utcOffset: number;
  disabled: boolean;
  comment: string | null;
}
