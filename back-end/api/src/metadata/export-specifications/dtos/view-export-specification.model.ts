import { ExportTypeEnum } from "../enums/export-type.enum";
import { ExportParameters } from "./create-export-specification.dto";

export interface ViewSpecificationExportModel  {
  id: number;
  name: string;
  description: string;
  exportType: ExportTypeEnum;
  parameters: ExportParameters;
  adapterId: number | null;
  disabled: boolean;
  comment: string | null;
}
