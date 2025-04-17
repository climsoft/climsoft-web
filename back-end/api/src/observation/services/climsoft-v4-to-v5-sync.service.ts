import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClimsoftV4V5SyncSetUpService } from './climsoft-v4-v5-sync-set-up.service';
import { DataSource, FindOptionsWhere } from 'typeorm';
import { SourceTemplatesService } from 'src/metadata/source-templates/services/source-templates.service';
import { ClimsoftV4ImportParametersDto } from '../dtos/climsoft-v4-import-parameters.dto';
import { SourceTemplateEntity } from 'src/metadata/source-templates/entities/source-template.entity';
import { CreateUpdateSourceDto } from 'src/metadata/source-templates/dtos/create-update-source.dto';
import { SourceTypeEnum } from 'src/metadata/source-templates/enums/source-type.enum';
import { ViewSourceDto } from 'src/metadata/source-templates/dtos/view-source.dto';

@Injectable()
export class ClimsoftV4ToV5SyncService {
    private readonly logger = new Logger(ClimsoftV4ToV5SyncService.name);
    private isImporting: boolean = false;
    private climsoftSource: { id: number, importParameters: ClimsoftV4ImportParametersDto } | undefined;
    private lastImportDate: string;

    constructor(
        private climsoftV4V5SetupService: ClimsoftV4V5SyncSetUpService,
        private sourcesService: SourceTemplatesService,
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
        params.fromEntryDate = this.lastImportDate;
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

        if (!this.lastImportDate) {
            this.lastImportDate = await this.getLastImportEntryDatetime();
        }


        this.logger.log('Last entry date time: ' + this.lastImportDate);

        //this.isImporting = false;



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

    private async getLastImportEntryDatetime(): Promise<string> {


        const sql: string = `
        SELECT entry_date_time FROM observations WHERE source_id = ${6}  
        ORDER BY entry_date_time DESC LIMIT 1;
    `;
        const results = await this.dataSource.manager.query(sql);

        // TODO. Format the results

        return results;
    }


}
