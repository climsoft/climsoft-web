import { IsBoolean, IsOptional } from "class-validator";

export class ExportTemplateParametersDto {
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