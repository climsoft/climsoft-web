
import { AggregateExportParametersModel } from './aggregate-export-parameters'; 
import { BufrExportParametersModel } from './bufr-export-parameters';
import { ExportTypeEnum } from './export-type.enum';
import { RawExportParametersModel } from './raw-export-parameters.dto'; 

export type ExportParameters = RawExportParametersModel | AggregateExportParametersModel | BufrExportParametersModel;

export interface CreateExportSpecificationModel {
  name: string;
  description: string;
  exportType: ExportTypeEnum;
  parameters: ExportParameters; // Used to be RawExportParametersModel but should now be generic
  disabled: boolean;
  comment: string | null;
}