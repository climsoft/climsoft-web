import { IsInt, IsOptional, IsString } from 'class-validator'; 
import { ExportTemplateParametersDto } from './export-template-paramers.dto';

export class CreateExportTemplateDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  //@ValidateNested()
  //@Type(function () { return this._type(); }) 
  @IsOptional() // TODO. Temporary until we implement validate nested
  parameters: ExportTemplateParametersDto; //TODO. Implement validations


  /**
   * Determines whether entry date time should be converted to UTC or not.
   * If true, the entry date time will be sent to the server based on date time selection on the client
   * If false, entry date time will be converted to UTC before being sent to sever
   */
  @IsInt()
  utcOffset: number;
}