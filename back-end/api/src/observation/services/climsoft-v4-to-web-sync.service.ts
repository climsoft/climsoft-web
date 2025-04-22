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

@Injectable()
export class ClimsoftV4ToWebSyncService {
    private readonly logger = new Logger(ClimsoftV4ToWebSyncService.name);
    private isImporting: boolean = false;
    private climsoftSource: { id: number, importParameters: ClimsoftV4ImportParametersDto } | undefined;
    private lastImportDate: string;
    private userId: number;

    constructor(
        private climsoftV4V5SetupService: ClimsoftV4WebSyncSetUpService,
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
                utcOffset: this.climsoftV4V5SetupService.v4UtcOffset,
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
        await this.climsoftV4V5SetupService.attemptFirstConnectionIfNotTried();

        if (!this.climsoftV4V5SetupService.v4DBPool) {
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
            this.climsoftV4V5SetupService.v4Conflicts.push('entry_date_time coud not be set up in version 4 database. Aborting import');
            return;
        }

        // Set acquisition tpe index if not set up
        if (!(await this.addAcquisitionTypeIndexIfNotExists())) {
            // Add the conflict and return
            this.climsoftV4V5SetupService.v4Conflicts.push('index idx_acquisition_type coud not be set up in version 4 database. Aborting import');
            return;
        }

        this.importV4ObservationstoV5DB();
    }

    public async stopV4Import() {
        this.climsoftSource = undefined;
        this.isImporting = false;
    }

    private async addEntryDateTimeColumnIfNotExists(): Promise<boolean> {
        if (this.climsoftV4V5SetupService.v4DBPool === null) {
            return false;
        }
        this.logger.log('Attempting to add column "entry_date_time" in v4 database');
        const connection = await this.climsoftV4V5SetupService.v4DBPool.getConnection();
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
        if (this.climsoftV4V5SetupService.v4DBPool === null) {
            return false;
        }
        this.logger.log('Attempting to add index for column"acquisitionType" in v4 database');
        const connection = await this.climsoftV4V5SetupService.v4DBPool.getConnection();
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
        if (!this.climsoftSource) {
            return;
        }


        // if version 4 database pool is not set up then return
        if (!this.climsoftV4V5SetupService.v4DBPool) {
            this.logger.log('Aborting saving. No V4 connection pool. ');
            return;
        }

        // If still importing then just return
        if (this.isImporting) {
            this.logger.log('Aborting saving. There is still an ongoing import. ');
            return;
        }

        // If there are any conflicts with version 4 database then areturn
        if (this.climsoftV4V5SetupService.v4Conflicts.length > 0) {
            this.logger.log('Aborting saving. V5 database has conflicts with v4 database: ', this.climsoftV4V5SetupService.v4Conflicts);
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

        const connection = await this.climsoftV4V5SetupService.v4DBPool.getConnection();
        try {
            console.log('SQL: ', sql);
            // Check if the column exists
            const v4Observations = await connection.query(sql);
            console.log('Results: ', v4Observations);

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
                //TODO. Left here. Do lots of checks

                const dto: CreateObservationDto = {
                    stationId: v4Observation.recordedFrom,
                    elementId: v4Observation.describedBy,
                    sourceId: v4Observation.obsDatetime,
                    level: v4Observation.obsLevel,
                    datetime: v4Observation.obsValue,
                    interval: 1,
                    value: v4Observation.obsValue,
                    flag: v4Observation.flag,
                    comment: null
                }

            }


            // Save the versin 4 observations to web database
            //await this.observationsService.bulkPut(obsDtos, this.userId, true);

            // Set last import date
            //this.lastImportDate = obsDtos[obsDtos.length-1].datetime;

            // Set saving to false before initiating another save operation
            this.isImporting = false;

            // Asynchronously initiate another save to version 4 operation
            //this.importV4ObservationstoV5DB();

        } catch (error) {
            this.logger.error('error when fetching data from observationfinal table', error);
            this.climsoftV4V5SetupService.v4Conflicts.push('error when fetching data from observationfinal table' + error);
        } finally {
            if (connection) await connection.release();
        }



    }









}
