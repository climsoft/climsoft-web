import { IsDate, IsNumber, IsString } from 'class-validator';

export class ObservationLogDto {
    @IsNumber()
    period: number;

    @IsNumber()
    value: number | null;

    @IsNumber()
    flag: number | null;

    @IsNumber()
    qcStatus: number;

    @IsNumber()
    entryUser: number

    @IsDate()
    entryDateTime?: string;

    @IsString()
    comment: string | null;
}