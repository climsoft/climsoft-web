import { IsEnum, IsString } from 'class-validator'; 
import { SourceTypeEnum } from '../enums/source-type.enum';

export class CreateSourceDto {

    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsString()
    extraMetadata: string;

    @IsEnum(SourceTypeEnum, { message: 'Source type must be a valid value' })
    sourceType: SourceTypeEnum;

}