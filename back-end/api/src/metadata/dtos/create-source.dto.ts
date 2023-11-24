import { IsNumber, IsString } from 'class-validator';

export class CreateSourceDto {

    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsString()
    extraMetadata: string;

    @IsNumber()
    sourceTypeId: number;

}