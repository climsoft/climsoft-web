import { IsEnum, IsNumber, IsString } from 'class-validator';
import { SourceTypeEnum } from '../entities/source.entity';

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