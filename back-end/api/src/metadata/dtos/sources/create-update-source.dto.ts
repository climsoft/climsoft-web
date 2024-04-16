import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { SourceTypeEnum } from '../../enums/source-type.enum';
import { Type } from 'class-transformer';

export class CreateUpdateSourceDto<T> {

    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsOptional() 
    //@ValidateNested()
    //@Type(function () { return this._type(); })
    extraMetadata: T | null; //TODO. Implement validations

    @IsEnum(SourceTypeEnum, { message: 'Source type must be a valid value' })
    sourceType: SourceTypeEnum;

}