import { IsDateString, IsInt, IsOptional } from "class-validator";

export class MetadataUpdatesQueryDto {
    @IsInt()
    lastModifiedCount: number;

    @IsOptional()
    @IsDateString({}, { message: 'Invalid date time format. Must be a valid ISO 8601 date string.' })
    lastModifiedDate?: string;
}

