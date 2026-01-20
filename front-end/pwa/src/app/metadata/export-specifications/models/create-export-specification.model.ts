
import { AggregateExportParametersModel } from './aggregate-export-parameters'; 
import { ExportTypeEnum } from './export-type.enum';
import { RawExportParametersModel } from './raw-export-parameters.dto';
import { WISDayCliExportParametersModel } from './wis-daycli-export-parameters';
import { WISSynopExportParametersModel } from './wis-synop-export-parameters';

export type ExportParameters = RawExportParametersModel | AggregateExportParametersModel | WISSynopExportParametersModel | WISDayCliExportParametersModel;

export interface CreateExportSpecificationModel {
  name: string;
  description: string;
  exportType: ExportTypeEnum;
  parameters: RawExportParametersModel;// TODO. Use ExportParameters; 
  disabled: boolean;
  comment: string | null;
}