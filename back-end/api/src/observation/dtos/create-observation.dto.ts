import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsString, Min, ValidateIf } from 'class-validator';

export class CreateObservationDto {
    @IsString()
    @IsNotEmpty()
    stationId: string;

    @IsInt()
    @Min(1)
    elementId: number;

    @IsInt()
    @Min(1)
    sourceId: number;

    @IsInt()
    @Min(0)
    level: number;

    @IsDateString()
    datetime: string;

    @IsInt()
    @Min(1)
    interval: number;

    @ValidateIf(o => o.value !== null)
    @IsNumber() // covers both integers and floats
    value: number | null;

    @ValidateIf(o => o.flagId !== null)
    @IsInt()
    @Min(1)
    flagId: number | null;

    @ValidateIf(o => o.comment !== null)
    @IsString()
    comment: string | null;
}
