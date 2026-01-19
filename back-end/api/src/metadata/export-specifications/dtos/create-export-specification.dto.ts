import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { RawExportParametersDto } from './raw-export-parameters.dto';
import { ExportTypeEnum } from '../enums/export-type.enum';
import { Type } from 'class-transformer';

export class CreateExportSpecificationDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(ExportTypeEnum, { message: 'export type must be a valid value' })
  exportType: ExportTypeEnum;

  @ValidateNested()
  @Type(() => RawExportParametersDto)
  parameters: RawExportParametersDto;

  @IsBoolean()
  disabled: boolean;

  @IsOptional()
  @IsString()
  comment: string | null;
}
