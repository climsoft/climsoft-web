import { IsDate, IsNumber, IsString } from 'class-validator';
import { Flag } from '../enums/flag.enum';
import { QCStatus } from '../enums/qc-status.enum';

export class CreateObservationDto {

    @IsString()
    stationId: string;

    @IsNumber()
    elementId: number;

    @IsNumber()
    sourceId: number;

    @IsString()
    elevation: number;

    @IsDate()
    datetime: string;

    @IsNumber()
    period: number;

    @IsNumber()
    value: number | null;

   
    flag: Flag | null;

    qcStatus: QCStatus;

    @IsString()
    comment: string | null;

}