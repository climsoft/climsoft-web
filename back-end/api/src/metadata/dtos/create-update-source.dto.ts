import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SourceTypeEnum } from '../enums/source-type.enum';

export class CreateUpdateSourceDto {

    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsOptional()
    @IsString()
    extraMetadata: string | null;

    @IsEnum(SourceTypeEnum, { message: 'Source type must be a valid value' })
    sourceType: SourceTypeEnum;

}