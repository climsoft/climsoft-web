import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { SourceTypeEnum } from 'src/metadata/source-templates/enums/source-type.enum';
import { StringUtils } from 'src/shared/utils/string.utils';
import { SourceParameters } from '../entities/source-specification.entity';


export class CreateUpdateSourceDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(SourceTypeEnum, { message: 'Source type must be a valid value' })
  sourceType: SourceTypeEnum;

  
  // TODO LEFT HERE
  
  @IsOptional()  
  parameters: SourceParameters; //TODO. Implement validations

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