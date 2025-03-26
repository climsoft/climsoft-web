import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";
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
  @IsInt()
  interval?: number;

  @IsOptional() // TODO. Important to validate the options here
  observationDate?: {
    last?: {
      duration: number,
      durationType: 'days' | 'hours'| 'minutes',
    };
    fromDate?: string;
    within?: {
      startDate: string;
      endDate: string;
    };
  };

  @IsOptional()
  expression?: any;
}