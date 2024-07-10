import { Injectable, NotFoundException } from '@nestjs/common';


import { CreateObservationDto } from '../dtos/create-observation.dto';
import { Index } from 'typeorm';
import { ObservationsService } from './observations.service';
import { isNumber } from 'class-validator';
import { StringUtils } from 'src/shared/utils/string.utils';
import { QCStatusEnum } from '../enums/qc-status.enum';
import { FlagEnum } from '../enums/flag.enum';
import { CreateImportTabularSourceDTO } from 'src/metadata/controllers/sources/dtos/create-import-source-tabular.dto';

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as duckdb from 'duckdb';


interface UploadedObservationDto extends CreateObservationDto {
    status: 'NEW' | 'UPDATE' | 'SAME' | 'INVALID';
}

@Injectable()
export class ObservationUploadService {

    private db: duckdb.Database;

    constructor(private readonly observationsService: ObservationsService) {
        this.db = new duckdb.Database(':memory:');

        this.db.all("SELECT * FROM duckdb_settings() WHERE name = 'threads';", function (err, res) {
            if (err) {
                console.warn(err);
                return;
            }
            console.log('duckdb res: ',res)
        });
    }

    async processFile(sourceId: number, file: Express.Multer.File, userId: number) {
       // console.log('Uploaded File: ', file);

        try {
            await fs.access('./tmp', fs.constants.F_OK)
        } catch (err) {
            console.error('tmp folder not found: ', err);
            await fs.mkdir('./tmp');
        }

        try {
            await fs.writeFile(`./tmp/user_${userId}_observations_upload${path.extname(file.originalname)}`, file.buffer);
        } catch (err) {
            console.error('Could not save user file', err);
            // TODO. Through an error.
        }

        console.log("Source Id", sourceId)


        return JSON.stringify('success');
    }



    //-----------------------

    private createColumns(source: CreateImportTabularSourceDTO): void {
        const columns: string[] = [];

        this.addStationColumn(source, columns);
        this.addElementAndValueColumn(source, columns);
        this.addPeriodColumn(source, columns);
        this.addElevationColumn(source, columns);
        this.addDateColumn(source, columns);

        //TODO. Create the table SQL


    }


    private addStationColumn(source: CreateImportTabularSourceDTO, columns: string[]) {
        if (source.stationDefinition) {
            columns.splice(source.stationDefinition.columnPosition - 1, 0, "station_id VARCHAR");
        }
    }

    private addElementAndValueColumn(source: CreateImportTabularSourceDTO, columns: string[]) {
        if (source.elementAndValueDefinition) {

            if (source.elementAndValueDefinition.noElement) {

                columns.splice(source.elementAndValueDefinition.noElement.valueColumnPosition - 1, 0, "value VARCHAR");

                if (source.elementAndValueDefinition.noElement.flagColumnPosition) {
                    columns.splice(source.elementAndValueDefinition.noElement.flagColumnPosition - 1, 0, "flag VARCHAR");
                }


            } else if (source.elementAndValueDefinition.hasElement) {

                if (source.elementAndValueDefinition.hasElement.singleColumn) {

                    columns.splice(source.elementAndValueDefinition.hasElement.singleColumn.elementColumnPosition - 1, 0, "element VARCHAR");

                    columns.splice(source.elementAndValueDefinition.hasElement.singleColumn.valueColumnPosition - 1, 0, "value VARCHAR");

                    if (source.elementAndValueDefinition.hasElement.singleColumn.flagColumnPosition) {
                        columns.splice(source.elementAndValueDefinition.hasElement.singleColumn.flagColumnPosition - 1, 0, "flag VARCHAR");
                    }

                } else if (source.elementAndValueDefinition.hasElement.multipleColumn) {
                    for (const el of source.elementAndValueDefinition.hasElement.multipleColumn) {
                        columns.splice(el.columnPosition - 1, 0, el.databaseId + " VARCHAR");
                    }
                }


            }
        }
    }

    private addPeriodColumn(source: CreateImportTabularSourceDTO, columns: string[]) {

        if (source.periodDefinition.columnPosition) {
            columns.splice(source.periodDefinition.columnPosition - 1, 0, "period VARCHAR");
        }

    }

    private addElevationColumn(source: CreateImportTabularSourceDTO, columns: string[]) {
        if (source.elevationColumnPosition) {
            columns.splice(source.elevationColumnPosition - 1, 0, "elevation VARCHAR");
        }
    }

    private addDateColumn(source: CreateImportTabularSourceDTO, columns: string[]) {

        if (source.datetimeDefinition.dateTimeColumnPostion !== undefined) {
            columns.splice(source.datetimeDefinition.dateTimeColumnPostion - 1, 0, "date_time VARCHAR");


        } else if (source.datetimeDefinition.dateTimeInMultipleColumn) {

            if (source.datetimeDefinition.dateTimeInMultipleColumn.dateInSingleColumn) {
                columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.dateInSingleColumn.dateColumnPosition - 1, 0, "date VARCHAR");

            } else if (source.datetimeDefinition.dateTimeInMultipleColumn.dateInMultipleColumn) {
                columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.dateInMultipleColumn.yearColumnPosition - 1, 0, "year VARCHAR");
                columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.dateInMultipleColumn.monthColumnPosition - 1, 0, "month VARCHAR");
                columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.dateInMultipleColumn.dayColumnPosition - 1, 0, "day VARCHAR");

            }

            if (source.datetimeDefinition.dateTimeInMultipleColumn.hourDefinition.columnPosition) {
                columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.hourDefinition.columnPosition - 1, 0, "hour VARCHAR");
            }

        }


    }



}
