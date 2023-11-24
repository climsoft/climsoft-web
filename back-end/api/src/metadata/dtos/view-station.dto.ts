import { IsDate, IsString } from 'class-validator';

export class ViewStationDto {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsString()
    comment: string | null;

    @IsString()
    entryUserId: string;

    @IsDate()
    entryDateTime: string;

}