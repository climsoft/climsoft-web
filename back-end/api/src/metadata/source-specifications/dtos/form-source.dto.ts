import { Transform, Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, Min, ValidateIf, ValidateNested } from "class-validator";
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

/**
 * Per-element configuration on a form.
 *
 * `hours: null` means the element inherits the form's `hours` (enabled at every form hour).
 * A non-empty array must be a subset of `FormSourceDTO.hours`. Empty arrays are rejected.
 */
export class FormElementMetadataDto {
  @IsInt()
  elementId!: number;

  @ValidateIf((_o, v) => v !== null && v !== undefined)
  @IsArray()
  @ArrayMinSize(1, { message: 'Element hours must be null (inherit) or a non-empty subset of the form hours' })
  @IsInt({ each: true })
  hours!: number[] | null;
}

export class FormSourceDTO {
  /** Defines the extra entry selectors used by the form to get data */
  @IsEnum(SelectorFieldControlType, { each: true, message: 'Each selector must be ELEMENT, DAY, or HOUR' })
  selectors: [SelectorFieldControlType, SelectorFieldControlType?];

  /** Defines the entry fields used by the form to display and enter data */
  @IsEnum(SelectorFieldControlType, { each: true, message: 'Each field must be ELEMENT, DAY, or HOUR' })
  fields: [SelectorFieldControlType, SelectorFieldControlType?];

  /** Layout used by entry fields */
  @IsEnum(LayoutType, { message: 'Layout must be either LINEAR or GRID' })
  layout: LayoutType;

  /** Per-element configuration for elements allowed on the form. */
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one element is required' })
  @ValidateNested({ each: true })
  @Type(() => FormElementMetadataDto)
  elementsMetadata: FormElementMetadataDto[];

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
