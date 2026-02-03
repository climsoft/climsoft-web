
import { AggregateExportParametersModel } from './aggregate-export-parameters.model'; 
import { BufrExportParametersModel } from './bufr-export-parameters.model';
import { ExportTypeEnum } from './export-type.enum';
import { RawExportParametersModel } from './raw-export-parameters.model'; 

export type ExportParameters = RawExportParametersModel | AggregateExportParametersModel | BufrExportParametersModel;

export interface CreateExportSpecificationModel {
  name: string;
  description: string;
  exportType: ExportTypeEnum;
  parameters: ExportParameters; // Used to be RawExportParametersModel but should now be generic
  disabled: boolean;
  comment: string | null;
}