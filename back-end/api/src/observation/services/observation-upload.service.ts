import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import { parse } from 'csv-parse';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { Index } from 'typeorm';
import { ObservationsService } from './observations.service';
import { isNumber } from 'class-validator';
import { StringUtils } from 'src/shared/utils/string.utils';
import { QCStatusEnum } from '../enums/qc-status.enum';
import { FlagEnum } from '../enums/flag.enum';

interface UploadedObservationDto extends CreateObservationDto {
    status: 'NEW' | 'UPDATE' | 'SAME' | 'INVALID';
}

@Injectable()
export class ObservationUploadService {

    constructor(private readonly observationsService: ObservationsService) { }

    async processFile(session: Record<string, any>, file: Express.Multer.File): Promise<string> {
        const observationDtos: CreateObservationDto[] = [];
        let index: number = 0;

        try {
            const parser = parse(file.buffer);
            for await (const row of parser) {

                index = index + 1;

                //console.log('row', row,'index', index)

                if (index === 1) {
                    if (row.length !== 9 ||
                        !row[0].toLowerCase().includes('station') ||
                        !row[1].toLowerCase().includes('element') ||
                        !row[2].toLowerCase().includes('source') ||
                        !row[3].toLowerCase().includes('level') ||
                        !row[4].toLowerCase().includes('date') ||
                        !row[5].toLowerCase().includes('period') ||
                        !row[6].toLowerCase().includes('value') ||
                        !row[7].toLowerCase().includes('flag') ||
                        !row[8].toLowerCase().includes('comment')) {
                        return 'invalid file format';
                    }

                    continue;

                }

                const stationId: string = row[0];
                const elementId: number = parseInt(row[1]);
                const sourceId:  number = parseInt(row[2]);
                const elevation: number =  row[3];
                const datetime: string =  row[4].toString();
                const period:  number = parseInt(row[5]);

                let value: number | null = null;
                let flag: FlagEnum | null = null;
                let comment: string | null = null;

                if (StringUtils.containsNumbersOnly(row[6])) {
                    value = parseFloat(row[6]);
                }

                if (StringUtils.containsNumbersOnly(row[7])) {
                    //TODO. validate the flag
                    flag =row[7];
                }

                if (row[8]) {
                    comment = row[8].toString();
                }



                if(value === null && flag === null){
                    continue;
                }


                const uploadedDto: UploadedObservationDto = {
                    stationId: stationId, elementId: elementId, sourceId: sourceId, elevation: elevation, datetime: datetime, period: period, value: value, flag: flag, comment: comment, status: 'NEW',
                }

                observationDtos.push(uploadedDto);

            }

        } catch (error) {
            console.log(`error found at row ${index}: ${error}`);

            return `error found at row ${index}: ${error}`;
        }


        if (observationDtos.length === 0) {
            //throw error;
            return 'no content found';
        }

        //TODO. pass correct user id
        const savedEntities = await this.observationsService.save(observationDtos, 1);



        //todo. later this may be necessary
        //this.saveFile(userId, JSON.stringify(observationDtos));

        //return `success, ${savedEntities.length}`;
        return JSON.stringify(`success, ${savedEntities.length}`) ;
    }


    private saveFile(session: Record<string, any>, fileContent: string): void {
        const userId = session.user.id;
        fs.writeFile(`C:/Users/patoe/Downloads/${userId}.json`, fileContent, err => {
            if (err) {
                console.error('Error when saving file:', err);
            }
            // file written successfully
        });
    }

}
