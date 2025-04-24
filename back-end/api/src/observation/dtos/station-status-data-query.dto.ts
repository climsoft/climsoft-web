import { IsInt, IsOptional, IsString } from "class-validator"; 

export class StationStatusDataQueryDto {
    @IsOptional()
    @IsInt()
    elementId?: number;

    @IsInt()
    duration: number;

    @IsString()
    durationType: 'hours' | 'days';
}

