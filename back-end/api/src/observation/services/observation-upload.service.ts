import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import { parse } from 'csv-parse';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { Index } from 'typeorm';
import { ObservationsService } from './observations.service';
import { isNumber } from 'class-validator';
import { StringUtils } from 'src/shared/utils/string.utils';

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
                const level: string =  row[3].toString();
                const datetime: string =  row[4].toString();
                const period:  number = parseInt(row[5]);

                let value: number | null = null;
                let flag: number | null = null;
                let comment: string | null = null;

                if (StringUtils.containsNumbersOnly(row[6])) {
                    value = parseFloat(row[6]);
                }

                if (StringUtils.containsNumbersOnly(row[7])) {
                    flag = parseInt(row[7]);
                }

                if (row[8]) {
                    comment = row[8].toString();
                }



                if(value === null && flag === null){
                    continue;
                }


                const uploadedDto: UploadedObservationDto = {
                    stationId: stationId, elementId: elementId, sourceId: sourceId, level: level, datetime: datetime, period: period, value: value, flag: flag, qcStatus: 0, comment: comment, status: 'NEW',
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

        //console.log(' to be saved', observationDtos);
        const savedEntities = await this.observationsService.save(observationDtos);



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
