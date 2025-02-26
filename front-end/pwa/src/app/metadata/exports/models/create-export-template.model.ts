
import { ExportTemplateParametersModel } from './export-template-params.model';

export interface CreateExportTemplateModel {
  name: string;
  description: string;
  parameters: ExportTemplateParametersModel; //TODO. Implement validations
  utcOffset: number;
}