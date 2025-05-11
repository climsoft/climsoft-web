import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClimsoftV4WebSyncSetUpService } from './climsoft-v4-web-sync-set-up.service';
import { ClimsoftV4ImportParametersDto } from '../dtos/climsoft-v4-import-parameters.dto';
import { ViewSourceDto } from 'src/metadata/source-templates/dtos/view-source.dto';
import { ObservationsService } from './observations.service';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { AppConfig } from 'src/app.config';
import { StringUtils } from 'src/shared/utils/string.utils';
import { FlagEnum } from '../enums/flag.enum';
import { DateUtils } from 'src/shared/utils/date.utils';

@Injectable()
export class ClimsoftV4ToWebSyncServiceOld {
    private readonly logger = new Logger(ClimsoftV4ToWebSyncServiceOld.name);
    private isImporting: boolean = false;
    private climsoftSource: ViewSourceDto | undefined;
    private userId: number;

    constructor(
        private climsoftV4WebSetupService: ClimsoftV4WebSyncSetUpService,
        private observationsService: ObservationsService,
    ) {
    }

    public getImportState(): boolean {
        return this.isImporting;
    }


    /**
     * Used for editing existing parameters or promting creation of new parameters by the front end
     * @returns 
     */
    public async getV4ImportParameters(): Promise<ClimsoftV4ImportParametersDto> {
        const existingClimsoftV4Source = await this.climsoftV4WebSetupService.getClimsoftImportSource();
        if (!existingClimsoftV4Source) {
            throw new NotFoundException(`not_found`);
        }
        return existingClimsoftV4Source.parameters as ClimsoftV4ImportParametersDto;
    }



    public async startV4Import(importParameters: ClimsoftV4ImportParametersDto, userId: number) {
        // Important note. Attempt to get any previous climsoft import source. If found set the last obervation final id. 
        // This is import to prevent duplication of fetching records already fetched
        const importSource = await this.climsoftV4WebSetupService.getClimsoftImportSource();
        if (importSource) {
            importParameters.lastObservationFinalDataId = (importSource.parameters as ClimsoftV4ImportParametersDto).lastObservationFinalDataId
        }

        // Save the new import parameters
        this.climsoftSource = await this.climsoftV4WebSetupService.saveClimsoftImportParameters(importParameters, userId);
        this.userId = userId;

        // Always attempt first connection if not tried before
        await this.climsoftV4WebSetupService.attemptFirstConnectionIfNotTried();

        if (!this.climsoftV4WebSetupService.v4DBPool) {
            this.logger.log('Aborting starting import. No V4 connection pool. ');
            return;
        }

        // Important don't await for the import. 
        // The set up may take a long time due to creation of indices
        this.setupV4andImportObservations();
    }

    private async setupV4andImportObservations() {
        // Set up 'entry_date_time' first if not already set up
        if (!(await this.addEntryDateTimeColumnIfNotExists())) {
            // Add the conflict and return
            this.climsoftV4WebSetupService.v4Conflicts.push('entry_date_time coud not be set up in version 4 database. Aborting import');
            return;
        }

        // Set acquisition tpe index if not set up
        if (!(await this.addAcquisitionTypeIndexIfNotExists())) {
            // Add the conflict and return
            this.climsoftV4WebSetupService.v4Conflicts.push('index idx_acquisition_type coud not be set up in version 4 database. Aborting import');
            return;
        }

        this.importV4ObservationstoV5DB();
    }

    public async stopV4Import() {
        this.climsoftSource = undefined;
        this.isImporting = false;
    }

    private async addEntryDateTimeColumnIfNotExists(): Promise<boolean> {
        if (this.climsoftV4WebSetupService.v4DBPool === null) {
            return false;
        }

        const connection = await this.climsoftV4WebSetupService.v4DBPool.getConnection();
        try {
            //------------------------------------------------
            // Check if the 'entry_date_time' column exists
            this.logger.log('Attempting to add column "entry_date_time" in v4 database');
            let result = await connection.query(
                `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = 'observationfinal' 
                 AND COLUMN_NAME = 'entry_date_time';`
            );

            if (result && result.length > 0) {
                this.logger.log('Column "entry_date_time" already exists: ' + result.toString());
            } else {
                this.logger.log('Adding column "entry_date_time"...');
                await connection.query(
                    `ALTER TABLE observationfinal
                     ADD COLUMN entry_date_time DATETIME(3) NOT NULL DEFAULT NOW(3);`
                );
                this.logger.log('Column "entry_date_time" added successfully.');
            }
            //------------------------------------------------


            //------------------------------------------------
            // Check if the 'entry_date_time' index exists
            this.logger.log('Attempting to add index for column "entry_date_time" in v4 database');
            result = await connection.query(
                `
                SELECT INDEX_NAME FROM information_schema.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'observationfinal' 
                AND INDEX_NAME = 'idx_entry_date_time';`
            );

            if (result && result.length > 0) {
                this.logger.log('Index for column "entry_date_time"  already exists: ' + result.toString());
            } else {
                this.logger.log('Adding index for column "entry_date_time"...');
                await connection.query(
                    `CREATE INDEX idx_entry_date_time ON observationfinal(entry_date_time);`
                );

                this.logger.log('Index for column "entry_date_time" added successfully.');
            }
            //------------------------------------------------

            //------------------------------------------------
            // Check if the 'entry_date_time' trigger exists
            this.logger.log('Attempting to add trigger for column "entry_date_time" in v4 database');
            result = await connection.query(
                `
                SELECT TRIGGER_NAME FROM information_schema.TRIGGERS 
                WHERE TRIGGER_SCHEMA = DATABASE() 
                AND EVENT_OBJECT_TABLE = 'observationfinal' 
                AND TRIGGER_NAME = 'trg_update_entry_date_time';`
            );

            if (result && result.length > 0) {
                this.logger.log('Trigger for column "entry_date_time" already exists: ' + result.toString());
            } else {
                this.logger.log('Adding trigger for column "entry_date_time"...');
                await connection.query(
                    ` 
                    CREATE OR REPLACE TRIGGER trg_update_entry_date_time 
                    BEFORE UPDATE ON observationfinal 
                    FOR EACH ROW SET NEW.entry_date_time = NOW(3);
                    `
                );

                this.logger.log('Trigger for column "entry_date_time" added successfully.');
            }
            //------------------------------------------------
            return true;
        } catch (error) {
            this.logger.error('Error while altering observationfinal table:', error);
            return false;
        } finally {
            if (connection) await connection.release();
        }
    }

    private async addAcquisitionTypeIndexIfNotExists(): Promise<boolean> {
        if (this.climsoftV4WebSetupService.v4DBPool === null) {
            return false;
        }

        const connection = await this.climsoftV4WebSetupService.v4DBPool.getConnection();
        try {
            // Check if 'acquisitionType' index exists
            this.logger.log('Attempting to add index for column "acquisitionType" in v4 database');
            const result = await connection.query(
                `SELECT INDEX_NAME FROM information_schema.STATISTICS 
                 WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = 'observationfinal' 
                 AND INDEX_NAME = 'idx_acquisition_type';`
            );

            if (result && result.length > 0) {
                this.logger.log('Index for column "acquisitionType" already exists: ' + result.toString());
            } else {
                this.logger.log('Adding index for column "acquisitionType"...');
                await connection.query(
                    `CREATE INDEX idx_acquisition_type ON observationfinal(acquisitionType);`
                );
                this.logger.log('Index for column "acquisitionType"  added successfully.');
            }
            return true;
        } catch (error) {
            this.logger.error('Error while altering observationfinal table:', error);
            return false;
        } finally {
            if (connection) await connection.release();
        }
    }

    private async importV4ObservationstoV5DB(): Promise<void> {
        // If importing from v4 to web is not allowed. Then just return
        if (!AppConfig.v4DbCredentials.v4Import) {
            return;
        }

        if (!this.climsoftSource) {
            return;
        }

        // if version 4 database pool is not set up then return
        if (!this.climsoftV4WebSetupService.v4DBPool) {
            this.logger.log('Aborting saving. No V4 connection pool. ');
            return;
        }

        // If still importing then just return
        if (this.isImporting) {
            this.logger.log('Aborting saving. There is still an ongoing import.');
            return;
        }

        // If there are any conflicts with version 4 database then areturn
        if (this.climsoftV4WebSetupService.v4Conflicts.length > 0) {
            this.logger.log('Aborting saving. V5 database has conflicts with v4 database: ', this.climsoftV4WebSetupService.v4Conflicts);
            return;
        }

        // Set is saving to true to prevent any further saving to v4 requests
        this.isImporting = true;

        const importParameters: ClimsoftV4ImportParametersDto = this.climsoftSource.parameters as ClimsoftV4ImportParametersDto;

        // Manually construct the SQL query
        const lastImportedDataDate: string = importParameters.fromEntryDate.replace('T', ' ').replace('Z', '');
        this.logger.log('import starting from date time: ' + lastImportedDataDate);

        let sqlCondition: string;

        if (importParameters.lastObservationFinalDataId) {
            //------------------------------
            // e.g `SELECT * FROM observationfinal WHERE 
            // (entry_date_time > '2025-01-01' 
            // OR 
            //  ( 
            //   entry_date_time = '2025-01-01' AND (recordedFrom, describedBy, obsDatetime, obsLevel) > ('13793888', 1, '2025-01-03 06:00:00', 'surface')
            //  ) 
            //  )
            // ORDER BY entry_date_time, recordedFrom, describedBy, obsDatetime, obsLevel LIMIT 5000;`
            // sqlCondition = `
            // (
            //   entry_date_time > '${lastImportedDataDate}' OR 
            //   (
            //     entry_date_time = '${lastImportedDataDate}' AND (recordedFrom, describedBy, obsDatetime, obsLevel) > (${importParameters.lastObservationFinalDataId})
            //   )
            // )`;

            //------------------------------
            const split: string[] = importParameters.lastObservationFinalDataId.split(',');
            const recordedFrom: string = split[0];
            const describedBy: string = split[1];
            const obsDatetime: string = split[2];
            const obsLevel: string = split[3];
            sqlCondition = `
  (
    entry_date_time > '${lastImportedDataDate}' OR
    (
      entry_date_time = '${lastImportedDataDate}' AND 
      (
        recordedFrom > ${recordedFrom} OR
        (recordedFrom = ${recordedFrom} AND describedBy > ${describedBy}) OR
        (recordedFrom = ${recordedFrom} AND describedBy = ${describedBy} AND obsDatetime > ${obsDatetime}) OR
        (recordedFrom = ${recordedFrom} AND describedBy = ${describedBy} AND obsDatetime = ${obsDatetime} AND obsLevel > ${obsLevel})
      )
    )
  )
            `;



        } else {
            // This will be used during the first import attempt
            sqlCondition = `entry_date_time > '${lastImportedDataDate}'`;
        }

        sqlCondition = sqlCondition + ` AND describedBy IN (${importParameters.elements.map(item => item.elementId).join(',')})`;

        if (importParameters.stationIds && importParameters.stationIds.length > 0) {
            sqlCondition = sqlCondition + ` AND recordedFrom IN (${importParameters.stationIds.map(id => `'${id}'`).join(',')})`;
        }

        if (!importParameters.includeClimsoftWebData) {
            sqlCondition = sqlCondition + ` AND acquisitiontype <> 7`;
        }

        // Note, the date time column precision is in milliseconds yet bulk inserts or updates due to factors like ALTER commands
        // may mean cause a lot of records to have the same entry date time. So the sorting of the key and it's inclusion in the 
        // where clause is necessary
        const sql: string = `
        SELECT recordedFrom, describedBy, obsDatetime, obsLevel, obsValue, flag, period, entry_date_time 
        FROM observationfinal 
        WHERE ${sqlCondition} ORDER BY entry_date_time, recordedFrom, describedBy, obsDatetime, obsLevel 
        LIMIT 10000;
        `;

        //console.log('SQL: ', sql)
        const connection = await this.climsoftV4WebSetupService.v4DBPool.getConnection();
        try {

            // Check if the column exists
            const v4Observations = await connection.query(sql);

            if (v4Observations.length === 0) {
                this.logger.log('Aborting importing. No v4 observations found. Will resume in: ' + importParameters.pollingInterval + ' minutes');
                setTimeout(() => {
                    this.importV4ObservationstoV5DB();
                }, importParameters.pollingInterval * 60000);// Convert minutes to milliseconds
                this.isImporting = false;
                return;
            }

            const obsDtos: CreateObservationDto[] = [];

            for (const v4Observation of v4Observations) {
                const v4StationId: string = v4Observation.recordedFrom;

                // Check for stations to ignore
                if (importParameters.stationIds) {
                    const stationsAllowedToSave = importParameters.stationIds.find(item => item === v4StationId);
                    if (!stationsAllowedToSave) {
                        continue;
                    }

                }

                // Check for stations that are in the web database
                if (!this.climsoftV4WebSetupService.webStations.has(v4StationId)) {
                    this.climsoftV4WebSetupService.v4Conflicts.push(`station id ${v4Observation.recordedFrom} not found in web database`)
                    continue;
                }

                const v4ElementId: number = Number(v4Observation.describedBy);
                const elementAllowedToSave = importParameters.elements.find(item => item.elementId === v4ElementId);
                if (!elementAllowedToSave) {
                    continue;
                }

                const webElementId: number = elementAllowedToSave.elementId;
                const webInterval: number = elementAllowedToSave.interval;
                const webLevel: number = v4Observation.obsLevel !== 'surface' && StringUtils.containsNumbersOnly(v4Observation.obsLevel) ? v4Observation.obsLevel : 0;
                const webDatetime: string = this.getWebDatetimeFromV4SQLDatetime(v4Observation.obsDatetime);
                const webValue: number | null = this.getWebvalue(v4Observation.obsValue);
                const webFlag: FlagEnum | null = this.getWebFlag(v4Observation.flag);

                if (webValue === null && webFlag === null) {
                    continue; // Web database does not accept this. So likely an error on the version 4 database
                }

                const dto: CreateObservationDto = {
                    stationId: v4StationId,
                    elementId: webElementId,
                    sourceId: this.climsoftSource.id,
                    level: webLevel,
                    datetime: webDatetime,
                    interval: webInterval,
                    value: webValue,
                    flag: webFlag,
                    comment: null
                }

                obsDtos.push(dto);
            }


            if (this.climsoftV4WebSetupService.v4Conflicts.length > 0) {
                this.logger.log('Aborting saving to v4. Web database has conflicts with v4 database: ', this.climsoftV4WebSetupService.v4Conflicts);
                this.isImporting = false;
                return;
            }

                // Get last import data that is required for next import
            const lastV4Data = v4Observations[v4Observations.length - 1];

            // Save the version 4 observations to web database
            this.logger.log('attempting to save v4 data into web database: ', lastV4Data.entry_date_time );
            await this.observationsService.bulkPut(obsDtos, this.userId, true);
            this.logger.log('v4 data successfully saved to web database');

        
            importParameters.fromEntryDate = this.convertV4DatetimeToJSDatetime(lastV4Data.entry_date_time);
            importParameters.lastObservationFinalDataId = `'${lastV4Data.recordedFrom}',${lastV4Data.describedBy},'${lastV4Data.obsDatetime}','${lastV4Data.obsLevel}'`;

            // update and save climsoft source parameters with the last entry date 
            // and last observation final composite key to web database
            // Note. Save the import parameters without waiting for web database response
            this.logger.log('Saving import parameters: ', importParameters.fromEntryDate, importParameters.lastObservationFinalDataId);
            this.climsoftSource.parameters = importParameters;
            this.climsoftV4WebSetupService.saveClimsoftImportParameters(importParameters, this.userId)

            // Set saving to false before initiating another save operation
            this.isImporting = false;

            // Asynchronously initiate another save to version 4 operation
            this.logger.log(`Initiating another import process`);
            this.importV4ObservationstoV5DB();

        } catch (error) {
            this.logger.error('error when fetching data from observationfinal table', error);
            this.climsoftV4WebSetupService.v4Conflicts.push('error when fetching data from observationfinal table' + error);
        } finally {
            if (connection) await connection.release();
        }
    }

    private getWebDatetimeFromV4SQLDatetime(v4SQLDatetime: string): string {
        // When getting data from v4, subtract the utc offset  
        // Assumes input is in UTC and formatted as 'YYYY-MM-DD HH:mm:ss'
        const utcDate = new Date(v4SQLDatetime.replace(' ', 'T') + 'Z');
        return DateUtils.getDatetimesBasedOnUTCOffset(utcDate.toISOString(), this.climsoftV4WebSetupService.v4UtcOffset, 'subtract');
    }

    private convertV4DatetimeToJSDatetime(v4Datetime: string): string {
        const utcDate = new Date(v4Datetime.replace(' ', 'T') + 'Z');
        return utcDate.toISOString();
    }

    private getWebvalue(v4Value: string): number | null {
        // Version 4 stores values as strings in the database. 
        // So do the folowing.

        // Check for empty string and nulls first. 
        if (!v4Value) {
            return null;
        }

        // Convert value to a valid number
        const num = Number(v4Value);
        return isNaN(num) ? null : num;
    }

    private getWebFlag(v4Flag: string | null): FlagEnum | null {
        if (!v4Flag) {
            return null;
        }

        const webFlags: FlagEnum[] = Object.values(FlagEnum);
        for (const webFlag of webFlags) {
            if (webFlag[0].toLowerCase() === v4Flag[0].toLowerCase()) {
                return webFlag;
            }
        }
        return null;
    }
}
