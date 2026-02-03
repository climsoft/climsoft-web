import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { RawExportParametersDto } from './raw-export-parameters.dto';
import { ExportTypeEnum } from '../enums/export-type.enum';
import { Type } from 'class-transformer';
import { BufrExportParametersDto } from './bufr-export-parameters.dto';
import { BadRequestException } from '@nestjs/common';
import { AggregateExportParametersDto } from './aggregate-export-parameters';

export type ExportParameters = RawExportParametersDto | AggregateExportParametersDto | BufrExportParametersDto;

export class CreateExportSpecificationDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(ExportTypeEnum, { message: 'export type must be a valid value' })
  exportType: ExportTypeEnum;

  @ValidateNested()
  @Type((options) => {
    // The 'options.object' gives access to the parent DTO,
    // allowing us to dynamically select the correct validation class
    // for the 'parameters' property based on the 'sourceType'.

    const object = options?.object;
    if (!object?.exportType) {
      throw new BadRequestException('source type is required for determining parameters type');
    }

    const { exportType } = object as CreateExportSpecificationDto;

    switch (exportType) {
      case ExportTypeEnum.RAW:
        return RawExportParametersDto;
      case ExportTypeEnum.AGGREGATE:
        return AggregateExportParametersDto;
      case ExportTypeEnum.BUFR:
        return BufrExportParametersDto;
      default:
        throw new BadRequestException('export type is not recognised');
    }
  })
  parameters: ExportParameters;

  @IsBoolean()
  disabled: boolean;

  @IsOptional()
  @IsString()
  comment: string | null;
}
