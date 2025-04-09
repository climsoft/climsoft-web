import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class ExportTemplateParametersDto {
  @IsOptional()
  @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
  @IsString({ each: true })
  stationIds?: string[];

  @IsOptional()
  @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
  @IsInt({ each: true })
  elementIds?: number[];

  @IsOptional()
  @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
  @IsInt({ each: true })
  intervals?: number[];

  @IsOptional() // TODO. Important to validate the options here
  observationDate?: {
    last?: {
      duration: number,
      durationType: 'days' | 'hours' | 'minutes',
    };
    fromDate?: string;
    within?: {
      startDate: string;
      endDate: string;
    };
  };


  // Data
  @IsOptional()
  @IsBoolean()
  convertDatetimeToDisplayTimeZone?: boolean;

  @IsOptional()
  @IsBoolean()
  splitObservationDatetime?: boolean;

  @IsOptional()
  @IsBoolean()
  unstackData?: boolean;

  @IsOptional()
  @IsBoolean()
  includeFlags?: boolean;

  @IsOptional()
  @IsBoolean()
  includeQCStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  includeQCLog?: boolean;

  @IsOptional()
  @IsBoolean()
  includeComments?: boolean;

  @IsOptional()
  @IsBoolean()
  includeEntryDatetime?: boolean;

  @IsOptional()
  @IsBoolean()
  includeEntryUserEmail?: boolean;

  // Metadata
  @IsOptional()
  @IsBoolean()
  includeStationName?: boolean;

  @IsOptional()
  @IsBoolean()
  includeStationLocation?: boolean;

  @IsOptional()
  @IsBoolean()
  includeElementName?: boolean;

  @IsOptional()
  @IsBoolean()
  includeElementUnits?: boolean;
}