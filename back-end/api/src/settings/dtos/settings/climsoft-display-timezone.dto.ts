import { IsInt, Min } from "class-validator";


export class ClimsoftDisplayTimeZoneDto {
    @IsInt()
    @Min(0)
    utcOffset: number;
}

