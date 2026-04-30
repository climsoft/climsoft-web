import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsString, Min, ValidateIf, ValidateNested } from 'class-validator';
import { SourceTypeEnum } from 'src/metadata/source-specifications/enums/source-type.enum';
import { FormSourceDTO as FormSourceDto } from './form-source.dto';
import { BadRequestException } from '@nestjs/common';
import { ClimsoftV4ImportParametersDto } from 'src/observation/dtos/climsoft-v4-import-parameters.dto';
import { ImportSourceDto } from './import-source.dto';

// Note, the `ClimsoftV4ImportParametersDto` will be deprecated after full migration to the Climsoft Web
export type SourceParameters = FormSourceDto | ImportSourceDto | ClimsoftV4ImportParametersDto;

export class CreateSourceSpecificationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(SourceTypeEnum, { message: 'Source type must be a valid value' })
  sourceType!: SourceTypeEnum;

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
  parameters!: SourceParameters;

  /** 
* Determines whether entry date time should be converted to UTC or not. 
* If true, the entry date time will be sent to the server based on date time selection on the lcient
* If false, entry date time will be converted to UTC before being sent to sever
*/
  @IsInt()
  @Min(0)
  utcOffset!: number;

  /**
* Determines whether to allow missing values or not.
* If true, entry of missing values will be allowed.
*/
  @IsBoolean()
  allowMissingValue!: boolean;

  /**
* Determines whether to scale the values. 
* To be used when data being imported is not scaled
*/
  @IsBoolean()
  scaleValues!: boolean;

  /**
 * Optional FK to a pre-import adapter. When set, the adapter is run
 * on the uploaded file before the existing import pipeline processes it.
 */

  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(1)
  adapterId!: number | null;

  /** Operation ID from the preview session that contains the sample file. Used to copy the file to the persistent samples directory on save. */
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @IsNotEmpty()
  sampleFileOperationId!: string | null;

  @IsBoolean()
  disabled!: boolean;

  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @IsNotEmpty()
  comment!: string | null;
}