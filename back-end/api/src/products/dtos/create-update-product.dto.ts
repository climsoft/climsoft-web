import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateUpdateProductDto {

    @IsString()
    @IsNotEmpty()
    supersetUuid!: string;

    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    description!: string | null;

    @IsOptional()
    @IsString()
    category!: string | null;

    @IsBoolean()
    disabled!: boolean;

}
