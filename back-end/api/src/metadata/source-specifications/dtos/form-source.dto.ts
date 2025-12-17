import { Transform } from "class-transformer";
import { IsBoolean, IsInt } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils"; 

export type ExtraSelectorControlType = 'ELEMENT' | 'DAY' | 'HOUR';
export type LayoutType = 'LINEAR' | 'GRID';

export class FormSourceDTO {

  /** Defines the extra entry selectors used by the form to get data */
  // TODO. Do validations
  selectors: [ExtraSelectorControlType, ExtraSelectorControlType?];

  /** Defines the entry fields used by the form to display and enter data */
  // TODO. Do validations
  fields: [ExtraSelectorControlType, ExtraSelectorControlType?];

  /** Layout used by entry fields */
  // TODO. Do validations
  layout: LayoutType;

  /** Elements ids allowed to be recorded by the form */
  @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
  @IsInt({ each: true })
  elementIds: number[];

  /** Hours allowed to be recorded by the form */
  @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
  @IsInt({ each: true })
  hours: number[];

  /** Interval for observation */
  @IsInt()
  interval: number;

  /**
  * Determines whether user is required to type in observation total or not.
  */
  @IsBoolean()
  requireTotalInput: boolean;

  @IsBoolean()
  allowEntryAtStationOnly: boolean;

  @IsBoolean()
  allowStationSelection: boolean;

  @IsBoolean()
  allowDoubleDataEntry: boolean;
}