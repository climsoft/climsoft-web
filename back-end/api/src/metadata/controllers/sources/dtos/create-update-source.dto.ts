import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { SourceTypeEnum } from '../../../enums/source-type.enum';

export class CreateUpdateSourceDto<T extends object> {

    @IsString()
    name: string;

    @IsString()
    description: string;

    //@ValidateNested()
    //@Type(function () { return this._type(); })
    @IsOptional() //TODO. This should be mandotory but the generics are being transpiled away. @IsIsOptional is a temporary solution.
    extraMetadata: T; //TODO. Implement validations

    @IsEnum(SourceTypeEnum, { message: 'Source type must be a valid value' })
    sourceType: SourceTypeEnum;

}