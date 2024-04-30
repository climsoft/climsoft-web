import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SourceTypeEnum } from '../../enums/source-type.enum';

export class CreateUpdateSourceDto<T extends object> {

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