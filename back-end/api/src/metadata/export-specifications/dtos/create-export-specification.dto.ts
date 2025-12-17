import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ExportSpecificationParametersDto } from './export-specification-parameters.dto';
import { ExportTypeEnum } from '../enums/export-type.enum';

export class CreateExportSpecificationDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(ExportTypeEnum, { message: 'export type must be a valid value' })
  exportType: ExportTypeEnum;

  //@ValidateNested()
  //@Type(function () { return this._type(); }) 
  @IsOptional() // TODO. Temporary until we implement validate nested
  parameters: ExportSpecificationParametersDto; //TODO. Implement validations

  @IsBoolean()
  disabled: boolean;

  @IsOptional()
  @IsString()
  comment: string | null;
}