import { IsBoolean, IsEnum,IsInt, IsOptional, IsString } from 'class-validator'; 
import { SourceTypeEnum } from 'src/metadata/sources/enums/source-type.enum';

export class CreateUpdateSourceDto{

    @IsString()
    name: string;

    @IsString()
    description: string;

    //@ValidateNested()
    //@Type(function () { return this._type(); }) 
    @IsOptional() // TODO. Temporary until we implement validate nested
    definitions: SourceDefinitionValidity; //TODO. Implement validations

    @IsEnum(SourceTypeEnum, { message: 'Source type must be a valid value' })
    sourceType: SourceTypeEnum;

    /** 
* Determines whether entry date time should be converted to UTC or not. 
* If true, the entry date time will be sent to the server based on date time selection on the lcient
* If false, entry date time will be converted to UTC before being sent to sever
*/
    @IsInt()
    utcOffset: number;

    /**
  * Determines whether to allow missing values or not.
  * If true, entry of missing values will be allowed.
  */
    @IsBoolean()
    allowMissingValue: boolean;

    /** Sample paper image that resembles the source design */
    @IsString()
    sampleImage: string;
}

export interface SourceDefinitionValidity{
  isValid(): boolean;
}