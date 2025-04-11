import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { QCStatusEnum } from "src/observation/enums/qc-status.enum";
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
      fromDate: string;
      toDate: string;
    };
  };

  @IsOptional()
  @IsEnum(QCStatusEnum, { message: 'qc status must be a valid QCStatusEnum value' })
  qcStatus?: QCStatusEnum;

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
  includeLevel?: boolean;

  @IsOptional()
  @IsBoolean()
  includeInterval?: boolean;

  @IsOptional()
  @IsBoolean()
  includeFlag?: boolean;

  @IsOptional()
  @IsBoolean()
  includeQCStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  includeQCTestLog?: boolean;

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
  includeStationElevation?: boolean;

  @IsOptional()
  @IsBoolean()
  includeElementAbbreviation?: boolean;

  @IsOptional()
  @IsBoolean()
  includeElementName?: boolean;

  @IsOptional()
  @IsBoolean()
  includeElementUnits?: boolean;

  @IsOptional()
  @IsBoolean()
  includeSourceName?: boolean;
}