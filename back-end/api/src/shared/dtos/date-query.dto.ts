import { IsDateString } from "class-validator";

export class DateQueryDto {
    @IsDateString({}, { message: 'Invalid date time format. Must be a valid ISO 8601 date string.' })
    date: string;
}

