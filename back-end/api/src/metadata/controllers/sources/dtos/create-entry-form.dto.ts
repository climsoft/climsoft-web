import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export type ExtraSelectorControlType = 'ELEMENT' | 'DAY' | 'HOUR';
export type LayoutType = 'LINEAR' | 'GRID';

export class CreateEntryFormDTO {

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
  @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
  @IsInt({ each: true })
  elementIds: number[];

  /** Hours allowed to be recorded by the form */
  @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
  @IsInt({ each: true })
  hours: number[];

  /** Period for observation */
  @IsInt()
  period: number;

  /** 
   * Determines whether entry date time should be converted to UTC or not. 
   * If true, the entry date time will be sent to the server based on date time selection on the lcient
   * If false, entry date time will be converted to UTC before being sent to sever
   */
  @IsInt()
  utcDifference: number;

  /** 
   * Determines whether to allow entries that don't pass observation limits.
   * If true, when limits are exceeded, data entry will not be allowed.
   */
  @IsBoolean()
  enforceLimitCheck: boolean;

  /**
   * Determines whether to allow missing values or not.
   * If true, entry of missing values will be allowed
   */
  allowMissingValue: boolean;

  /**
  * Determines whether user is required to type in observation total or not.
  */
  @IsBoolean()
  requireTotalInput: boolean;

  /** Sample paper image that resembles the form design */
  @IsOptional()
  @IsString()
  sampleImage: string;
}