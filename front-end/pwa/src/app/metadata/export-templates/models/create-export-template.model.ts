
import { ExportTemplateParametersModel } from './export-template-params.model';
import { ExportTypeEnum } from './export-type.enum';

export interface CreateExportTemplateModel {
  name: string;
  description: string;
  exportType: ExportTypeEnum;
  parameters: ExportTemplateParametersModel; 
  disabled: boolean;
  comment: string | null;
}