import { BadRequestException, Injectable, StreamableFile } from '@nestjs/common';
import { DataSource } from "typeorm"
import { ExportTemplateParametersDto } from 'src/metadata/export-templates/dtos/export-template-paramers.dto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { ViewTemplateExportDto } from 'src/metadata/export-templates/dtos/view-export-template.dto';
import { ExportTemplatesService } from 'src/metadata/export-templates/services/export-templates.service';
import { AppConfig } from 'src/app.config';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';

@Injectable()
export class ExportObservationsService {
    constructor(
        private exportTemplatesService: ExportTemplatesService,
        private dataSource: DataSource,
        private fileIOService: FileIOService,) {
    }

    public async generateExports(exportTemplateId: number, query: ViewObservationQueryDTO, userId: number): Promise<number> {
        const viewTemplateExportDto: ViewTemplateExportDto = await this.exportTemplatesService.find(exportTemplateId);

        // If export is disabled then don't generate it
        if (viewTemplateExportDto.disabled) {
            throw new BadRequestException('Export disabled');
        }

        const exportParams: ExportTemplateParametersDto = this.filterOutTemplateUsingQuery(viewTemplateExportDto.parameters, query);
        const outputPath: string = `/var/lib/postgresql/exports/${userId}_${exportTemplateId}.csv`;

        // Manually construct the SQL query
        let sqlCondition: string = '';

        // DATA FILTER SELECTIONS
        //------------------------------------------------------------------------------------------------
        if (exportParams.stationIds && exportParams.stationIds.length > 0) {
            sqlCondition = ` AND ob.station_id IN (${exportParams.stationIds.map(id => `'${id}'`).join(',')})`;
        }

        if (exportParams.elementIds && exportParams.elementIds.length > 0) {
            sqlCondition = sqlCondition + ` AND ob.element_id IN (${exportParams.elementIds.join(',')})`;
        }

        if (exportParams.intervals && exportParams.intervals.length > 0) {
            sqlCondition = sqlCondition + ` AND ob.interval IN (${exportParams.intervals.join(',')})`;
        }

        if (exportParams.observationDate) {
            if (exportParams.observationDate.within) {
                const within = exportParams.observationDate.within;
                sqlCondition = sqlCondition + ` AND ob.date_time BETWEEN '${within.fromDate}' AND '${within.toDate}'`;
            } else if (exportParams.observationDate.fromDate) {
                sqlCondition = sqlCondition + ` AND ob.date_time >= '${exportParams.observationDate.fromDate}'`;
            } else if (exportParams.observationDate.last) {
                const durationType = exportParams.observationDate.last.durationType;
                const duration = exportParams.observationDate.last.duration;
                if (durationType === 'days') {
                    sqlCondition = sqlCondition + ` AND ob.date_time >= NOW() - INTERVAL '${duration} days'`;
                } else if (durationType === 'hours') {
                    sqlCondition = sqlCondition + ` AND ob.date_time >= NOW() - INTERVAL '${duration} hours'`;
                } else if (durationType === 'minutes') {
                    sqlCondition = sqlCondition + ` AND ob.date_time >= NOW() - INTERVAL '${duration} minutes'`;
                }
            }
        }

        if (exportParams.qcStatus) {
            sqlCondition = sqlCondition + ` AND ob.qc_status = '${exportParams.qcStatus}'`;
        }
        //------------------------------------------------------------------------------------------------

        // DATA PROCESSING SELECTIONS
        //------------------------------------------------------------------------------------------------

        let datetimeColumns: string = 'ob.date_time, ';
        const displayUtcOffset = 0; // TODO. Left here
        if (exportParams.convertDatetimeToDisplayTimeZone) {
            if (exportParams.splitObservationDatetime) {
                datetimeColumns = `
                EXTRACT(YEAR FROM ob.date_time + INTERVAL '${displayUtcOffset} hours') AS year,
                EXTRACT(MONTH FROM ob.date_time + INTERVAL '${displayUtcOffset} hours') AS month,
                EXTRACT(DAY FROM ob.date_time + INTERVAL '${displayUtcOffset} hours') AS day,
                EXTRACT(HOUR FROM (ob.date_time + INTERVAL '${displayUtcOffset} hours') ) AS hour,
                TO_CHAR((date_time)::time, 'MI:SS') AS mins_secs_micros,`;
            } else {
                datetimeColumns = `(ob.date_time + INTERVAL '${displayUtcOffset} hours') AS date_time`;
            }

        } else {

            if (exportParams.splitObservationDatetime) {
                datetimeColumns = `
                EXTRACT(YEAR FROM ob.date_time) AS year,
                EXTRACT(MONTH FROM ob.date_time ) AS month,
                EXTRACT(DAY FROM ob.date_time) AS day,
                EXTRACT(HOUR FROM (ob.date_time) ) AS hour,
                TO_CHAR((date_time)::time, 'MI:SS') AS mins_secs_micros,`;
            }
        }



        let valueColumns: string = 'ob.value, ';
        if (exportParams.unstackData) {

        } else {

            if (exportParams.includeFlags) {
                valueColumns = valueColumns + 'ob.flag, ';
            }

            if (exportParams.includeQCStatus) {
                valueColumns = valueColumns + 'ob.qc_status, ';
            }

            if (exportParams.includeQCTestLog) {
                valueColumns = valueColumns + 'ob.qc_test_log, ';
            }

            if (exportParams.includeComments) {
                valueColumns = valueColumns + 'ob.comment, ';
            }

            if (exportParams.includeEntryDatetime) {
                if (exportParams.convertDatetimeToDisplayTimeZone) {
                    datetimeColumns = valueColumns + `(ob.entry_date_time + INTERVAL '${displayUtcOffset} hours') AS entry_date_time`;
                } else {
                    valueColumns = valueColumns + 'ob.entry_date_time, ';
                }
            }

            if (exportParams.includeEntryUserEmail) {
                valueColumns = valueColumns + 'us.email, ';
            }

        }
        //------------------------------------------------------------------------------------------------

        // METADATA SELECTIONS
        //------------------------------------------------------------------------------------------------
        let stationColumns: string = 'ob.station_id, ';
        let elementColumns: string = 'ob.element_id, ';
        let sourceColumns: string = 'ob.source_id, ';
        if (exportParams.includeStationName) {
            stationColumns = stationColumns + 'st.name, ';
        }

        if (exportParams.includeStationLocation) {
            stationColumns = stationColumns + 'ST_Y(st.location) AS latitude, ST_X(st.location) AS longitude, ';
        }

        if (exportParams.includeStationElevation) {
            stationColumns = stationColumns + 'st.elevation, ';
        }

        if (exportParams.includeElementName) {
            elementColumns = elementColumns + 'el.name, ';
        }

        if (exportParams.includeElementUnits) {
            elementColumns = elementColumns + 'el.units, ';
        }

        if (exportParams.includeSourceName) {
            sourceColumns = sourceColumns + 'so.name, ';
        }

        //------------------------------------------------------------------------------------------------

        const sql = `
            COPY (
                SELECT 
                ${stationColumns} ${elementColumns} ${sourceColumns}, ob.level, ob.interval, ${datetimeColumns} ${valueColumns} 
                FROM observations ob
                INNER JOIN stations st on ob.station_id = st.id
                INNER JOIN elements el on ob.element_id = el.id
                INNER JOIN source_templates so on ob.source_id = so.id
                INNER JOIN users us on ob.entry_user_id = us.id
                WHERE ob.deleted = false 
                ${sqlCondition} 
                ORDER BY ob.date_time ASC
            ) TO '${outputPath}' WITH CSV HEADER;
        `;

        console.log('Executing COPY command:', sql); // Debugging log

        // Execute raw SQL query (without parameterized placeholders)
        // TODO. Find away of tracking the export process at the database level
        const results = await this.dataSource.manager.query(sql);

        console.log('Postgres copying done: ', outputPath, ' Results: ', results);

        // Return the path to the generated CSV file
        return viewTemplateExportDto.id;
    }

    private filterOutTemplateUsingQuery(exportParams: ExportTemplateParametersDto, query: ViewObservationQueryDTO): ExportTemplateParametersDto {

        if (exportParams.stationIds && exportParams.stationIds.length > 0) {
            if (query.stationIds) {
                exportParams.stationIds = exportParams.stationIds.filter(item => query.stationIds?.includes(item));
            }
        } else {
            exportParams.stationIds = query.stationIds;
        }

        if (exportParams.elementIds && exportParams.elementIds.length > 0) {
            if (query.stationIds) {
                exportParams.elementIds = exportParams.elementIds.filter(item => query.elementIds?.includes(item));
            }
        } else {
            exportParams.elementIds = query.elementIds;
        }

        if (exportParams.intervals && exportParams.intervals.length > 0) {
            if (query.stationIds) {
                exportParams.intervals = exportParams.intervals.filter(item => query.intervals?.includes(item));
            }
        } else {
            exportParams.intervals = query.intervals;
        }



        if (exportParams.observationDate) {
            if (exportParams.observationDate.within) {


                if (query.fromDate) {
                    if (new Date(query.fromDate) < new Date(exportParams.observationDate.within.fromDate)) {
                        throw new BadRequestException('from date can not be less that what is allowed by the template');
                    }
                    exportParams.observationDate.within.fromDate = query.fromDate;
                }

                if (query.toDate) {
                    if (new Date(query.toDate) > new Date(exportParams.observationDate.within.toDate)) {
                        throw new BadRequestException('to date can not be greater that what is allowed by the template');
                    }
                    exportParams.observationDate.within.toDate = query.toDate;
                }

            } else if (exportParams.observationDate.fromDate) {

                if (query.fromDate) {
                    if (new Date(query.fromDate) < new Date(exportParams.observationDate.fromDate)) {
                        throw new BadRequestException('from date can not be less that what is allowed by the template');
                    }
                    exportParams.observationDate.fromDate = query.fromDate;
                }
            }
        }



        return exportParams;
    }

    public async downloadExport(exportTemplateId: number, userId: number): Promise<StreamableFile> {
        const viewTemplateExportDto: ViewTemplateExportDto = await this.exportTemplatesService.find(exportTemplateId);

        // If export is disabled then don't generate it
        if (viewTemplateExportDto.disabled) {
            throw new BadRequestException('Export disabled');
        }

        let outputPath: string = AppConfig.devMode ? this.fileIOService.tempFilesFolderPath : '/app/exports';
        outputPath = `${outputPath}/${userId}_${exportTemplateId}.csv`;
        console.log('Downloading from: ', outputPath);

        // TODO log the export

        return this.fileIOService.createStreamableFile(outputPath);
    }

}
