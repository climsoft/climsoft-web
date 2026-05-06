import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsString, ValidateIf, ValidateNested } from 'class-validator';
import { RawExportParametersDto } from './raw-export-parameters.dto';
import { ExportTypeEnum } from '../enums/export-type.enum';
import { Type } from 'class-transformer';
import { DisseminationExportParametersDto } from './dissemination-export-parameters.dto';
import { BadRequestException } from '@nestjs/common';
import { AggregateExportParametersDto } from './aggregate-export-parameters.dto';

export type ExportParameters = RawExportParametersDto | AggregateExportParametersDto | DisseminationExportParametersDto;

export class CreateExportSpecificationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(ExportTypeEnum, { message: 'export type must be a valid value' })
  exportType!: ExportTypeEnum;

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
      case ExportTypeEnum.DISSEMINATION:
        return DisseminationExportParametersDto;
      default:
        throw new BadRequestException('export type is not recognised');
    }
  })
  @ValidateNested()
  parameters!: ExportParameters;

  /**
 * Optional FK to a post-export adapter. When set, the adapter is run
 * on the exported file before delivering it to the user.
 */
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  adapterId!: number | null;

  @IsBoolean()
  disabled!: boolean;

  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @IsNotEmpty()
  comment!: string | null;
}
