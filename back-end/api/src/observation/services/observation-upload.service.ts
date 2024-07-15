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
import { SourcesService } from 'src/metadata/controllers/sources/services/sources.service';
import { ViewSourceDto } from 'src/metadata/controllers/sources/dtos/view-source.dto';
import { CreateImportSourceDTO } from 'src/metadata/controllers/sources/dtos/create-import-source.dto';


interface UploadedObservationDto extends CreateObservationDto {
    status: 'NEW' | 'UPDATE' | 'SAME' | 'INVALID';
}

@Injectable()
export class ObservationUploadService {

    private db: duckdb.Database;
    private tempFilesFolderPath: string;

    constructor(
        private observationsService: ObservationsService,
        private sourcesService: SourcesService) {

        this.setupFolder()

        this.db = new duckdb.Database(':memory:');

        // this.db.all("SELECT * FROM duckdb_settings() WHERE name = 'threads';", function (err, res) {
        //     if (err) {
        //         console.warn(err);
        //         return;
        //     }
        //     console.log('duckdb res: ', res)
        // });
    }

    async setupFolder(): Promise<void> {
        this.tempFilesFolderPath = path.resolve('./tmp');
        // For windows platform, replace the backslashes with forward slashes.
        this.tempFilesFolderPath = this.tempFilesFolderPath.replaceAll("\\", "\/");
        // Check if the temporary directory exist. 
        try {
            await fs.access(this.tempFilesFolderPath, fs.constants.F_OK)
        } catch (err1) {
            // If it doesn't create the directory.
            try {
                await fs.mkdir(this.tempFilesFolderPath);
            } catch (err2) {
                console.error("Could not create temporary folder: ", err2);
                // TODO. Throw appropriiate error.
            }

        }

    }


    async processFile(sourceId: number, file: Express.Multer.File, userId: number) {

        const newFileName: string = `${this.tempFilesFolderPath}/user_${userId}_observations_upload${path.extname(file.originalname)}`;


        // Save the file to the temporary directory
        try {
            await fs.writeFile(`${newFileName}`, file.buffer);
        } catch (err) {
            console.error('Could not save user file', err);
            // TODO. Through an error.
        }

        // Get the source using the source id
        const sourceDefinition: CreateImportSourceDTO = (await this.sourcesService.find(sourceId)).extraMetadata as CreateImportSourceDTO;
        if (sourceDefinition.format === "TABULAR") {
            this.importTabularSource(sourceDefinition as CreateImportTabularSourceDTO, newFileName);
        } else {
            return JSON.stringify('error: source not supported yet.');
        }

        console.log("Source Id", sourceId);
        //TODO. Left here.

        //Get source
        //Create the table.
        //TODO. Later do the actual import status through server sent events in the front end to check progress of duckdb import operation.





        return JSON.stringify('success');
    }



    //-----------------------

    private importTabularSource(source: CreateImportTabularSourceDTO, fileName: string): void {
        const columns: string[] = [];


        const tableName: string = path.basename(fileName, path.extname(fileName));
        const params: string[] = ['all_varchar = true', 'header = false', `skip = ${source.rowsToSkip}`];

        if (source.delimiter) {
            params.push(`delim = '${source.delimiter}'`);
        }

        const sql: string = `CREATE TABLE ${tableName} AS SELECT * FROM read_csv('${fileName}',  ${params.join(",")})`;

        console.log('sql: ', sql);

        // if (1 === 1) {
        //     return;
        // }

        this.db.run(sql,  (err) => {
                if (err) {
                    console.error(err);
                    return;
                }
                this.GetFileColumns(tableName);


            });
    }

    private GetFileColumns(tableName: string) {
        this.db.all(`DESCRIBE SELECT * FROM ${tableName}`,  (err, res)=> {
            if (err) {
                console.warn(err);
                return;
            }
            console.log('describe response: ', res);

            // TODO. Left here
        });
    }

    private createColumns(sourceDefinition: CreateImportTabularSourceDTO): string[] {
        const columns: string[] = this.createColumns(sourceDefinition);

        this.addStationColumn(sourceDefinition, columns);
        this.addElementAndValueColumn(sourceDefinition, columns);
        this.addPeriodColumn(sourceDefinition, columns);
        this.addElevationColumn(sourceDefinition, columns);
        this.addDateColumn(sourceDefinition, columns);

        return columns;
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
