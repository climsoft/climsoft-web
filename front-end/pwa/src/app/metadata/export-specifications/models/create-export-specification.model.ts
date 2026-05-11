import { AggregateExportParametersModel } from './aggregate-export-parameters.model';
import { DisseminationExportParametersModel } from './dissemination-export-parameters.model';
import { ExportTypeEnum } from './export-type.enum';
import { RawExportParametersModel } from './raw-export-parameters.model';

export type ExportParameters = RawExportParametersModel | AggregateExportParametersModel | DisseminationExportParametersModel;

export interface CreateExportSpecificationModel {
  name: string;
  description: string;
  exportType: ExportTypeEnum;
  parameters: ExportParameters;
  adapterId: number | null;
  disabled: boolean;
  comment: string | null;
}
