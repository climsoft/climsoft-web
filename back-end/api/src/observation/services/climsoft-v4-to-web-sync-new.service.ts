import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClimsoftV4WebSyncSetUpService } from './climsoft-v4-web-sync-set-up.service';
import { ClimsoftV4ImportParametersDto, ElementIntervalDto } from '../dtos/climsoft-v4-import-parameters.dto';
import { ViewSourceDto } from 'src/metadata/source-templates/dtos/view-source.dto';
import { ObservationsService } from './observations.service';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { AppConfig } from 'src/app.config';
import { StringUtils } from 'src/shared/utils/string.utils';
import { FlagEnum } from '../enums/flag.enum';
import { DateUtils } from 'src/shared/utils/date.utils';
import * as mariadb from 'mariadb';

@Injectable()
export class ClimsoftV4ToWebSyncServiceNew {
    private readonly logger = new Logger(ClimsoftV4ToWebSyncServiceNew.name);
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
                this.logger.log('Index for column "acquisitionType" already exists');
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
            this.logger.log('Aborting import. No climsoft source. ');
            return;
        }

        // if version 4 database pool is not set up then return
        if (!this.climsoftV4WebSetupService.v4DBPool) {
            this.logger.log('Aborting import. No V4 connection pool. ');
            return;
        }

        // If still importing then just return
        if (this.isImporting) {
            this.logger.log('Aborting import. There is still an ongoing import.');
            return;
        }

        // If there are any conflicts with version 4 database then areturn
        if (this.climsoftV4WebSetupService.v4Conflicts.length > 0) {
            this.logger.log('Aborting import. web database has conflicts with v4 database: ', this.climsoftV4WebSetupService.v4Conflicts);
            return;
        }

        // Set is saving to true to prevent any further saving to v4 requests
        this.isImporting = true;

        // Get v4 last entry date time as a snapshot of the v4 database
        const v4LastEntryDatetime: string = await this.getV4LastEntryDatetome();
        if (!v4LastEntryDatetime) {
            this.climsoftV4WebSetupService.v4Conflicts.push('V4 last entry date time not found');
            this.logger.log('Aborting import. V4 last entry date time not found');
            this.isImporting = false;
            return;
        }

        const importParameters: ClimsoftV4ImportParametersDto = this.climsoftSource.parameters as ClimsoftV4ImportParametersDto;
        // Get the station ids to import
        const stationIds: string[] = importParameters.stationIds && importParameters.stationIds.length > 0 ?
            importParameters.stationIds : Array.from(this.climsoftV4WebSetupService.webStations);

        // Get last imported date
        const lastImportDate: string = importParameters.fromEntryDate.replace('T', ' ').replace('Z', '');

        this.logger.log('Import starting from date time: ' + lastImportDate);
        let anyFoundObservationSaved: boolean = false;
        for (const stationId of stationIds) {
            for (const element of importParameters.elements) {
                // If user stopped the import process then abort.
                if (!this.climsoftSource) {
                    this.logger.log('Aborting import. No climsoft source. ');
                    this.isImporting = false;
                    return;
                }

                // If there were any conflicts in saving then abort. 
                if (this.climsoftV4WebSetupService.v4Conflicts.length > 0) {
                    this.logger.log('Aborting import. Web database has conflicts with v4 database: ', this.climsoftV4WebSetupService.v4Conflicts);
                    this.isImporting = false;
                    return;
                }

                // If observations were found and saved, set `anyFoundObservationSaved` to true 
                if (await this.importandSaveV4StationAndElementRecords(
                    this.climsoftV4WebSetupService.v4DBPool,
                    stationId,
                    element,
                    lastImportDate,
                    v4LastEntryDatetime,
                    this.climsoftSource.id)) {
                    anyFoundObservationSaved = true;
                }

            }
        }

        // Update and save climsoft source parameters with the last entry date
        // Note. Save the import parameters without waiting for web database response
        importParameters.fromEntryDate = this.convertV4DatetimeToJSDatetime(v4LastEntryDatetime);
        //importParameters.lastObservationFinalDataId = `${stationId},${element.elementId}`;
        this.logger.log('Saving from date import parameter: ' + importParameters.fromEntryDate);
        this.climsoftSource.parameters = importParameters;
        this.climsoftV4WebSetupService.saveClimsoftImportParameters(importParameters, this.userId)

        // Set saving to false before initiating another save operation
        this.isImporting = false;

        if (anyFoundObservationSaved) {
            // If there is any observations saved then
            // immediately asynchronously initiate another save to version 4 operation
            this.logger.log(`Initiating another import process`);
            this.importV4ObservationstoV5DB();
        } else {
            // If no observations were found and saved. Resume the import after the set interval
            this.logger.log('Import done. Will resume in: ' + importParameters.pollingInterval + ' minutes');
            setTimeout(() => {
                this.importV4ObservationstoV5DB();
            }, importParameters.pollingInterval * 60000);// Convert minutes to milliseconds
        }
    }

    private async getV4LastEntryDatetome(): Promise<string> {
        // if version 4 database pool is not set up then return
        if (!this.climsoftV4WebSetupService.v4DBPool) {
            this.logger.log('Aborting saving. No V4 connection pool. ');
            return '';
        }

        const connection = await this.climsoftV4WebSetupService.v4DBPool.getConnection();
        try {
            const result = await connection.query(`
            SELECT MAX(entry_date_time) AS max_entry_date_time FROM observationfinal;`);
            return result[0].max_entry_date_time
        } catch (error) {
            this.logger.error('Error when fetching last entry date time from observationfinal', error);
        } finally {
            if (connection) await connection.release();
        }
        return '';
    }

    private async importandSaveV4StationAndElementRecords(v4DBPool: mariadb.Pool, stationId: string, element: ElementIntervalDto, startEntryDateTime: string, endEntryDatetime: string, climsoftSourceId: number): Promise<boolean> {

        const sql: string = ` 
            SELECT obsDatetime, obsLevel, obsValue, flag, period 
            FROM observationfinal 
            WHERE 
            recordedFrom = '${stationId}' 
            AND describedBy = ${element.elementId} 
            AND entry_date_time > '${startEntryDateTime}' 
            AND entry_date_time <= '${endEntryDatetime}' 
            AND acquisitiontype <> 7;
        `;

        const connection = await v4DBPool.getConnection();
        try {

            // Check if the column exists
            const v4Observations = await connection.query(sql);

            if (v4Observations.length === 0) {
                return false;
            }

            const obsDtos: CreateObservationDto[] = [];
            for (const v4Observation of v4Observations) {
                const webLevel: number = v4Observation.obsLevel !== 'surface' && StringUtils.containsNumbersOnly(v4Observation.obsLevel) ? v4Observation.obsLevel : 0;
                const webDatetime: string = this.getWebDatetimeFromV4SQLDatetime(v4Observation.obsDatetime);
                //---------------------------------------------
                // TODO. Think about the period
                const webInterval: number = element.interval;
                //---------------------------------------------
                const webValue: number | null = this.getWebvalue(v4Observation.obsValue);
                const webFlag: FlagEnum | null = this.getWebFlag(v4Observation.flag);

                if (webValue === null && webFlag === null) {
                    continue; // Web database does not accept this. So likely an error on the version 4 database
                }

                const dto: CreateObservationDto = {
                    stationId: stationId,
                    elementId: element.elementId,
                    sourceId: climsoftSourceId,
                    level: webLevel,
                    datetime: webDatetime,
                    interval: webInterval,
                    value: webValue,
                    flag: webFlag,
                    comment: null
                }

                obsDtos.push(dto);
            }

            // Save the version 4 observations to web database 
            this.logger.log('Saving v4 observations ' + v4Observations.length + ' for station ' + stationId + ' and element ' + element.elementId);
            await this.observationsService.bulkPut(obsDtos, this.userId, true);

            return true;
        } catch (error) {
            this.logger.error('Error when fetching data from observationfinal table', error);
            this.climsoftV4WebSetupService.v4Conflicts.push('error when fetching data from observationfinal table' + error);
        } finally {
            if (connection) await connection.release();
        }

        return false;
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
