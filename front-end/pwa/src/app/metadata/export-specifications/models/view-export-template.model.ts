import { ExportTemplateParametersModel } from "./export-template-params.model";
import { ExportTypeEnum } from "./export-type.enum";

export interface ViewExportTemplateModel {
  id: number;
  name: string;
  description: string;
  exportType: ExportTypeEnum;
  parameters: ExportTemplateParametersModel; //TODO. Implement validations 
  disabled: boolean;
  comment: string | null;
}
