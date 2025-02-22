import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateExportDto {
  @IsString()
  name: string;

  @IsString()
  description: string;


  //@ValidateNested()
  //@Type(function () { return this._type(); }) 
  @IsOptional() // TODO. Temporary until we implement validate nested
  parameters: ExportParametersDto; //TODO. Implement validations

  /** 
* Determines whether entry date time should be converted to UTC or not. 
* If true, the entry date time will be sent to the server based on date time selection on the lcient
* If false, entry date time will be converted to UTC before being sent to sever
*/
  @IsInt()
  utcOffset: number;

}

// export interface ExportParametersValidity {
//   isValid(): boolean;
// }

export interface ExportParametersDto {
  stationIds?: string[];
  elementIds?: number[];
  sourceIds?: number[];
  period?: number;
  ObsevationRange?: {
    last?: number; // In days
    dateRange?: { 
      startDate: string;
      endDate: string;
    };
  };
  expression?: any;

}