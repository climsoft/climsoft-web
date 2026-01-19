import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { SourceTypeEnum } from 'src/metadata/source-specifications/enums/source-type.enum';
import { StringUtils } from 'src/shared/utils/string.utils'; 
import { FormSourceDTO as FormSourceDto } from './form-source.dto';
import { BadRequestException } from '@nestjs/common';
import { ClimsoftV4ImportParametersDto } from 'src/observation/dtos/climsoft-v4-import-parameters.dto';  
import { ImportSourceDto } from './import-source.dto';

// Note, the `ClimsoftV4ImportParametersDto` will be deprecated after full migration to the Climsoft Web
export type SourceParameters = FormSourceDto | ImportSourceDto | ClimsoftV4ImportParametersDto; 

export class CreateSourceSpecificationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;

  @IsEnum(SourceTypeEnum, { message: 'Source type must be a valid value' })
  sourceType: SourceTypeEnum;

  @ValidateNested()
  @Type((options) => {
    // The 'options.object' gives access to the parent DTO,
    // allowing us to dynamically select the correct validation class
    // for the 'parameters' property based on the 'sourceType'.

    const object = options?.object;
    if (!object?.sourceType) {
      throw new BadRequestException('source type is required for determining parameters type');
    }

    const { sourceType } = object as CreateSourceSpecificationDto;

    switch (sourceType) {
      case SourceTypeEnum.FORM:
        return FormSourceDto;
      case SourceTypeEnum.IMPORT:
        return ImportSourceDto;
      default:
        throw new BadRequestException('source type is not recognised');
    }
  })
  parameters: SourceParameters;

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
  @IsOptional()
  @Type(() => String) // Required to stop transformer from converting the value type to boolean
  @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
  allowMissingValue?: boolean;

  /**
* Determines whether to scale the values. 
* To be used when data being imported is not scaled
*/
  @IsOptional()
  @Type(() => String) // Required to stop transformer from converting the value type to boolean
  @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
  scaleValues?: boolean;

  /** Sample paper image that resembles the source design */
  @IsOptional()
  @IsString()
  sampleImage?: string;

  @IsOptional()
  @Type(() => String) // Required to stop transformer from converting the value type to boolean
  @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
  disabled?: boolean;

  @IsOptional()
  @IsString()
  comment?: string | null;
}