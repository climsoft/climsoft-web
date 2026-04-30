import { ExportParameters } from "./create-export-specification.model";
import { ExportTypeEnum } from "./export-type.enum";

export interface ViewExportSpecificationModel {
  id: number;
  name: string;
  description: string;
  exportType: ExportTypeEnum;
  parameters: ExportParameters;
  adapterId: number | null;
  disabled: boolean;
  comment: string | null;
}
