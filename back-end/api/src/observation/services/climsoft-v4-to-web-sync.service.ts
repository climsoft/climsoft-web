import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClimsoftV4WebSyncSetUpService } from './climsoft-v4-web-sync-set-up.service';
import { DataSource, FindOptionsWhere } from 'typeorm';
import { SourceTemplatesService } from 'src/metadata/source-templates/services/source-templates.service';
import { ClimsoftV4ImportParametersDto } from '../dtos/climsoft-v4-import-parameters.dto';
import { SourceTemplateEntity } from 'src/metadata/source-templates/entities/source-template.entity';
import { CreateUpdateSourceDto } from 'src/metadata/source-templates/dtos/create-update-source.dto';
import { SourceTypeEnum } from 'src/metadata/source-templates/enums/source-type.enum';
import { ViewSourceDto } from 'src/metadata/source-templates/dtos/view-source.dto';
import { ObservationsService } from './observations.service';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { AppConfig } from 'src/app.config';
import { StringUtils } from 'src/shared/utils/string.utils';
import { FlagEnum } from '../enums/flag.enum';
import { DateUtils } from 'src/shared/utils/date.utils';

@Injectable()
export class ClimsoftV4ToWebSyncService {
    private readonly logger = new Logger(ClimsoftV4ToWebSyncService.name);
    private isImporting: boolean = false;
    private climsoftSource: { id: number, importParameters: ClimsoftV4ImportParametersDto } | undefined;
    private lastImportDate: string;
    private userId: number;

    constructor(
        private climsoftV4WebSetupService: ClimsoftV4WebSyncSetUpService,
        private sourcesService: SourceTemplatesService,
        private observationsService: ObservationsService,
        private dataSource: DataSource,
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
        const existingClimsoftV4Source = await this.getClimsoftImportSource();
        if (!existingClimsoftV4Source) {
            throw new NotFoundException(`not_found`);
        }

        const params: ClimsoftV4ImportParametersDto = existingClimsoftV4Source.parameters as ClimsoftV4ImportParametersDto;
        // Update the from date to reflect the last import date
        // Helps user to restart the import from where it last stopped
        if (this.lastImportDate) params.fromEntryDate = this.lastImportDate;

        return params;
    }

    private async getClimsoftImportSource(): Promise<ViewSourceDto | null> {
        const selectOptions: FindOptionsWhere<SourceTemplateEntity> = {
            name: 'climsoft_v4',
        };
        await this.sourcesService.findAll(selectOptions, false);
        const existingClimsoftV4Source = await this.sourcesService.findAll(selectOptions, false);
        return existingClimsoftV4Source.length > 0 ? existingClimsoftV4Source[0] : null;
    }

    public async startV4Import(importParameters: ClimsoftV4ImportParametersDto, userId: number) {
        this.climsoftSource = { id: 0, importParameters: importParameters };
        this.userId = userId;

        const existingClimsoftV4Source = await this.getClimsoftImportSource();
        if (existingClimsoftV4Source) {
            existingClimsoftV4Source.parameters = importParameters;
            this.climsoftSource.id = (await this.sourcesService.update(existingClimsoftV4Source.id, existingClimsoftV4Source, userId)).id;
        } else {
            const newClismoftSource: CreateUpdateSourceDto = {
                name: 'climsoft_v4',
                description: 'Import from Climsoft version 4 database',
                sourceType: SourceTypeEnum.IMPORT,
                parameters: importParameters,
                utcOffset: this.climsoftV4WebSetupService.v4UtcOffset,
                allowMissingValue: true,
                scaleValues: false,
                sampleImage: '',
                disabled: false,
                comment: null,

            }
            this.climsoftSource.id = (await this.sourcesService.create(newClismoftSource, userId)).id
        }

        if (this.climsoftSource.importParameters.fromEntryDate) {
            this.lastImportDate = this.climsoftSource.importParameters.fromEntryDate;
        }

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
        this.logger.log('Attempting to add column "entry_date_time" in v4 database');
        const connection = await this.climsoftV4WebSetupService.v4DBPool.getConnection();
        try {
            // Check if the column exists
            const result = await connection.query(
                `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = 'observationfinal' 
                 AND COLUMN_NAME = 'entry_date_time';`
            );

            if (result && result.length > 0) {
                this.logger.log('Column "entry_date_time" already exists: ' + result);
            } else {
                this.logger.log('Adding column "entry_date_time"...');
                await connection.query(
                    `ALTER TABLE observationfinal
                     ADD COLUMN entry_date_time DATETIME NOT NULL DEFAULT NOW();`
                );
                this.logger.log('Column "entry_date_time" added successfully.');

                await connection.query(
                    `CREATE INDEX idx_entry_date_time ON observationfinal(entry_date_time);`
                );

                this.logger.log('Index for column "entry_date_time" added successfully.');

                await connection.query(
                    ` 
                    CREATE OR REPLACE TRIGGER trg_update_entry_date_time 
                    BEFORE UPDATE ON observationfinal 
                    FOR EACH ROW SET NEW.entry_date_time = NOW();
                    `
                );

                this.logger.log('Before update trigger for column "entry_date_time" added successfully.');
            }
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
        this.logger.log('Attempting to add index for column"acquisitionType" in v4 database');
        const connection = await this.climsoftV4WebSetupService.v4DBPool.getConnection();
        try {
            // Check if the column exists
            const result = await connection.query(
                `SELECT INDEX_NAME FROM information_schema.STATISTICS 
                 WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = 'observationfinal' 
                 AND INDEX_NAME = 'idx_acquisition_type';`
            );

            if (result && result.length > 0) {
                this.logger.log('Index for column "acquisitionType"  already exists: ' + result);
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
        // If importing from v4 to v5 is not allowed. Then just return
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
            this.logger.log('Aborting saving. There is still an ongoing import. ');
            return;
        }

        // If there are any conflicts with version 4 database then areturn
        if (this.climsoftV4WebSetupService.v4Conflicts.length > 0) {
            this.logger.log('Aborting saving. V5 database has conflicts with v4 database: ', this.climsoftV4WebSetupService.v4Conflicts);
            return;
        }

        // Set is saving to true to prevent any further saving to v4 requests
        this.isImporting = true;

        const importParameters: ClimsoftV4ImportParametersDto = this.climsoftSource.importParameters;
        if (!this.lastImportDate) {
            this.lastImportDate = importParameters.fromEntryDate;
        }


        this.logger.log('Last entry date time: ' + this.lastImportDate);

        // Manually construct the SQL query
        let sqlCondition: string = `entry_date_time >= '${this.lastImportDate}'`;

        sqlCondition = sqlCondition + ` AND describedBy IN (${importParameters.elements.map(item => item.elementId).join(',')})`;

        if (importParameters.stationIds && importParameters.stationIds.length > 0) {
            sqlCondition = sqlCondition + ` AND recordedFrom IN (${importParameters.stationIds.map(id => `'${id}'`).join(',')})`;
        }

        if (!importParameters.includeClimsoftWebData) {
            sqlCondition = sqlCondition + ` AND acquisitiontype <> 7`;
        }

        const sql: string = `
        SELECT recordedFrom, describedBy, obsDatetime, obsLevel, obsValue, flag, period, entry_date_time 
        FROM observationfinal 
        WHERE ${sqlCondition} ORDER BY entry_date_time ASC LIMIT 1000;
        `;

        const connection = await this.climsoftV4WebSetupService.v4DBPool.getConnection();
        try {

            // Check if the column exists
            const v4Observations = await connection.query(sql);
            console.log('v4 observations: ', v4Observations);

            if (v4Observations.length === 0) {
                this.isImporting = false;
                this.logger.log('Aborting imorting. No v4 observations found. Will resume in: ');
                setTimeout(() => {
                    // TODO
                }, 10000);
                // Save the last entry date to database
                return;
            }


            const obsDtos: CreateObservationDto[] = [];

            for (const v4Observation of v4Observations) {

                const v4StationId: string = v4Observation.recordedFrom;
                if (importParameters.stationIds) {
                    const stationsAllowedToSave = importParameters.stationIds.find(item => item === v4StationId);
                    if (!stationsAllowedToSave) {
                        continue;
                    }

                } else if (!this.climsoftV4WebSetupService.webStations.has(v4StationId)) {
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
                const webDatetime: string = this.getWebDatetime(v4Observation.obsDatetime);
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

            console.log('web observations: ', obsDtos);


            // Save the versin 4 observations to web database
            //await this.observationsService.bulkPut(obsDtos, this.userId, true);

            // Set last import date
            this.lastImportDate = DateUtils.getDateOnlyAsString(new Date(obsDtos[obsDtos.length - 1].datetime));

            // Set saving to false before initiating another save operation
            this.isImporting = false;

            // Asynchronously initiate another save to version 4 operation
            this.importV4ObservationstoV5DB();

            console.log('lastImportDate: ',  this.lastImportDate);

        } catch (error) {
            this.logger.error('error when fetching data from observationfinal table', error);
            this.climsoftV4WebSetupService.v4Conflicts.push('error when fetching data from observationfinal table' + error);
        } finally {
            if (connection) await connection.release();
        }
    }

    private getWebDatetime(v4Datetime: string): string {
        // When getting data from v4, subtract the utc offset  
        return DateUtils.getDatetimesBasedOnUTCOffset(v4Datetime, this.climsoftV4WebSetupService.v4UtcOffset, 'subtract');
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
