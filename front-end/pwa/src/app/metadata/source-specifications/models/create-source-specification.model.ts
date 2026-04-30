import { ImportSourceModel } from "./import-source.model";
import { FormSourceModel } from "./form-source.model";
import { SourceTypeEnum } from "./source-type.enum";

export type SourceParameters = FormSourceModel | ImportSourceModel;

export interface CreateSourceSpecificationModel {
  name: string;
  description: string;
  sourceType: SourceTypeEnum;
  parameters: SourceParameters;
  utcOffset: number;
  allowMissingValue: boolean;
  scaleValues: boolean;
  adapterId: number | null;
  sampleFileOperationId: string | null;
  disabled: boolean;
  comment: string | null;
}