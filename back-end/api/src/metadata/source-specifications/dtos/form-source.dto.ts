import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, Min } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export enum SelectorFieldControlType {
  ELEMENT = 'ELEMENT',
  DAY = 'DAY',
  HOUR = 'HOUR'
}

export enum LayoutType {
  LINEAR = 'LINEAR',
  GRID = 'GRID'
}

export class FormSourceDTO {
  /** Defines the extra entry selectors used by the form to get data */
  @IsArray()
  @IsEnum(SelectorFieldControlType, { each: true, message: 'Each selector must be ELEMENT, DAY, or HOUR' })
  selectors: [SelectorFieldControlType, SelectorFieldControlType?];

  /** Defines the entry fields used by the form to display and enter data */
  @IsArray()
  @IsEnum(SelectorFieldControlType, { each: true, message: 'Each field must be ELEMENT, DAY, or HOUR' })
  fields: [SelectorFieldControlType, SelectorFieldControlType?];

  /** Layout used by entry fields */
  @IsEnum(LayoutType, { message: 'Layout must be either LINEAR or GRID' })
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
  @Min(1)
  interval: number;

  /**
  * Determines whether user is required to type in observation total or not.
  */
  @IsOptional()
  @Type(() => String) // Required to stop transformer from converting the value type to boolean
  @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
  requireTotalInput?: boolean;

  @IsOptional()
  @Type(() => String) // Required to stop transformer from converting the value type to boolean
  @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
  allowEntryAtStationOnly?: boolean;

  @IsOptional()
  @Type(() => String) // Required to stop transformer from converting the value type to boolean
  @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
  allowStationSelection?: boolean;

  @IsOptional()
  @Type(() => String) // Required to stop transformer from converting the value type to boolean
  @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
  allowDoubleDataEntry?: boolean;
}