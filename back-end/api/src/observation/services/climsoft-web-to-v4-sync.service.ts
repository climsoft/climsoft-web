import { Injectable, Logger } from '@nestjs/common';
import * as mariadb from 'mariadb';
import { ObservationEntity } from '../entities/observation.entity';
import { Repository, UpdateResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NumberUtils } from 'src/shared/utils/number.utils';
import { DateUtils } from 'src/shared/utils/date.utils';
import { ClimsoftV4WebSyncSetUpService, V4ElementModel } from './climsoft-v4-web-sync-set-up.service';
import { AppConfig } from 'src/app.config';

@Injectable()
export class ClimsoftWebToV4SyncService {
    private readonly logger = new Logger(ClimsoftWebToV4SyncService.name);
    private isSaving: boolean = false;

    constructor(
        private climsoftV4WebSetupService: ClimsoftV4WebSyncSetUpService,
        @InjectRepository(ObservationEntity) private observationRepo: Repository<ObservationEntity>,
    ) {
    }

    public async saveWebObservationstoV4DB(): Promise<void> {
        // If saving to v4 is not allowed thhen just return
        if (!AppConfig.v4DbCredentials.v4Save) {
            return;
        }

        // Always attempt first connection if not tried before
        await this.climsoftV4WebSetupService.attemptFirstConnectionIfNotTried();

        // if version 4 database pool is not set up then return
        if (!this.climsoftV4WebSetupService.v4DBPool) {
            this.logger.log('Aborting saving. No V4 connection pool. ');
            return;
        }

        // If still saving then just return
        if (this.isSaving) {
            this.logger.log('Aborting saving. There is still an ongoing saving. ');
            return;
        }

        // If there are any conflicts with version 4 database then areturn
        if (this.climsoftV4WebSetupService.v4Conflicts.length > 0) {
            this.logger.log('Aborting saving. V5 database has conflicts with v4 database: ', this.climsoftV4WebSetupService.v4Conflicts);
            return;
        }

        // Set is saving to true to prevent any further saving to v4 requests
        this.isSaving = true;

        // Check if there is observations that have not been uploaded to v4
        // If there are, then attempt to save them
        const obsEntities: ObservationEntity[] = await this.observationRepo.find({
            where: { savedToV4: false },
            order: { entryDateTime: "ASC" },
            take: 1000,// Monitor this valuue for performance. The idea is to not keep nodeJS work thread for long when saving to v4 model
        });

        if (obsEntities.length === 0) {
            this.isSaving = false;
            this.logger.log('Aborting saving. No entities found.');
            return;
        }

        this.logger.log('Saving changes to V4 database: ' + obsEntities.length);

        const deletedEntities: ObservationEntity[] = [];
        const insertedOrUpdatedEntities: ObservationEntity[] = [];

        for (const entity of obsEntities) {
            // Separate deleted data from inserted or updated data
            if (entity.deleted) {
                deletedEntities.push(entity);
            } else {
                insertedOrUpdatedEntities.push(entity);
            }
        }

        // Bulk delete when soft delete happens
        if (deletedEntities.length > 0) {
            if (await this.deleteSoftDeletedV5DataFromV4DB(this.climsoftV4WebSetupService.v4DBPool, deletedEntities)) {
                // Update the save to v4 column in the V5 database.
                await this.updateV5DBWithNewV4SaveStatus(this.observationRepo, deletedEntities);
            }
        }

        // Bulk insert or update when there are new inserts or updates
        if (insertedOrUpdatedEntities.length > 0) {
            if (await this.insertOrUpdateWebDataToV4DB(this.climsoftV4WebSetupService.v4DBPool, insertedOrUpdatedEntities)) {
                // Update the save to v4 column in the V5 database.
                await this.updateV5DBWithNewV4SaveStatus(this.observationRepo, insertedOrUpdatedEntities);
            }
        }

        // Set saving to false before initiating another save operation
        this.isSaving = false;

        // Asynchronously initiate another save to version 4 operation
        this.saveWebObservationstoV4DB();
    }

    private async insertOrUpdateWebDataToV4DB(v4DBPool: mariadb.Pool, entities: ObservationEntity[]): Promise<boolean> {
        // Get a connection from the pool
        const connection = await v4DBPool.getConnection();
        try {
            const upsertStatement = `
            INSERT INTO observationinitial (
                recordedFrom, 
                describedBy, 
                obsDatetime, 
                obsLevel,
                obsValue, 
                flag,
                period,             
                qcStatus,
                qcTypeLog,
                acquisitionType,
                dataForm,
                capturedBy
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                obsValue = VALUES(obsValue),
                flag = VALUES(flag),
                period = VALUES(period),
                qcTypeLog = VALUES(qcTypeLog),
                capturedBy = VALUES(capturedBy)
        `;

            const values: (string | number | null | undefined)[][] = [];
            for (const entity of entities) {

                if (!this.climsoftV4WebSetupService.v4Stations.has(entity.stationId)) {
                    this.climsoftV4WebSetupService.v4Conflicts.push(`station id ${entity.stationId} not found in v4 database`)
                    continue;
                }

                const v4Element = this.climsoftV4WebSetupService.v4Elements.get(entity.elementId);
                // If element not found, just continue
                if (!v4Element) {
                    this.climsoftV4WebSetupService.v4Conflicts.push(`element id ${entity.elementId} not found in v4 database`)
                    continue;
                }

                let sourceName: string | undefined = this.climsoftV4WebSetupService.webSources.get(entity.sourceId);
                // if source name not found then a new user was added. So refetch v5 sources and attempt to find the source name again
                if (!sourceName) {
                    await this.climsoftV4WebSetupService.setupV5Sources();
                    sourceName = this.climsoftV4WebSetupService.webSources.get(entity.sourceId);
                }

                let userEmail: string | undefined = this.climsoftV4WebSetupService.webUsers.get(entity.entryUserId);
                // if email not found then a new user was added. So refetch v5 users and attempt to find the email again
                if (!userEmail) {
                    await this.climsoftV4WebSetupService.setupWebUsers();
                    userEmail = this.climsoftV4WebSetupService.webUsers.get(entity.entryUserId);
                }

                const v4ValueMap = this.getV4ValueMapping(v4Element, entity);

                values.push([
                    entity.stationId,
                    entity.elementId,
                    v4ValueMap.v4DBDatetime,
                    v4ValueMap.v4Level,
                    v4ValueMap.v4ScaledValue,
                    v4ValueMap.v4Flag,
                    v4ValueMap.v4DBPeriod, // period
                    0, // qcStatus
                    null, // qcTypeLog
                    7, // acquisitionType
                    sourceName, // dataForm.  
                    userEmail  // capturedBy. T
                ]);

            }

            if (this.climsoftV4WebSetupService.v4Conflicts.length > 0) {
                return false;
            }

            // Execute the batch upsert 
            const results: mariadb.UpsertResult = await connection.batch(upsertStatement, values);

            this.logger.log('V4 afftected rows: ' + results.affectedRows);

            // As of 03/02/2025, when an existing row is updated MariaDB counts this as a row affected twice
            // Once for detecting the conflict (i.e., attempting to insert)
            // Once for performing the update
            // So more affected rows should return true as well.
            return results.affectedRows >= entities.length;
        } catch (err) {
            console.error('Error saving observations to v4 initial table:', err);
            return false;
        } finally {
            if (connection) connection.release(); // Ensure the connection is released back to the pool
        }
    }

    private getV4ValueMapping(v4Element: V4ElementModel, entity: ObservationEntity): { v4Level: string, v4DBPeriod: number | null, v4ScaledValue: number | string | null, v4Flag: string | null, v4DBDatetime: string } {
        // V4 database model expects empty for null values
        let period: number = 1;
        // If element is daily and period is greater than 1 day then calculate the period using day as scale.
        // V4 period supports cumulation at daily interval only.
        if (v4Element.elementType === 'daily' && entity.interval > 1440) {
            // Important to round off due to precision errors
            period = NumberUtils.roundOff(entity.interval / 1440, 4);
        }
        // Important to round off due to precision errors
        let scaledValue: number | null | string = (entity.value && v4Element.elementScale) ? NumberUtils.roundOff(entity.value / v4Element.elementScale, 4) : entity.value;
        const adjustedDatetime: string = this.getV4AdjustedDatetimeInDBFormat(entity.datetime);
        const level: string = entity.level === 0 ? 'surface' : `${entity.level}`;
        const flag: string = entity.flag ? entity.flag[0].toUpperCase() : '';

        // V4 database model expects empty for null values
        if (scaledValue === null) {
            scaledValue = '';
        }
        return { v4Level: level, v4DBPeriod: period, v4ScaledValue: scaledValue, v4Flag: flag, v4DBDatetime: adjustedDatetime };
    }

    private getV4AdjustedDatetimeInDBFormat(date: Date): string {
        // When saving to version 4 database, add the offset.
        const strAdjustedDate = DateUtils.getDatetimesBasedOnUTCOffset(date.toISOString(), this.climsoftV4WebSetupService.v4UtcOffset, 'add');
        return strAdjustedDate.replace('T', ' ').replace('Z', '');
    }

    private async deleteSoftDeletedV5DataFromV4DB(v4DBPool: mariadb.Pool, entities: ObservationEntity[]): Promise<boolean> {
        // Get a connection from the pool
        const connection = await v4DBPool.getConnection();
        try {
            // Define the DELETE statement using the composite keys
            const deleteStatement = `
            DELETE FROM observationinitial
            WHERE recordedFrom = ?
              AND describedBy = ?
              AND obsDatetime = ?
              AND obsLevel = ?
              AND qcStatus = ?
              AND acquisitionType = ?
              AND dataForm = ?
          `;

            // Build an array of values for each row to delete.
            // In this example we assume that the values used to generate the composite key 
            // are derived in the same way as in your insert/upsert function.
            const values: (string | number | null | undefined)[][] = [];
            for (const entity of entities) {

                // If it's not 
                if (!entity.deleted) {
                    continue;
                }

                // Retrieve the v4 element information
                const v4Element = this.climsoftV4WebSetupService.v4Elements.get(entity.elementId);
                if (!v4Element) {
                    // Skip entities that do not have a corresponding v4 element
                    continue;
                }

                const sourceName: string | undefined = this.climsoftV4WebSetupService.webSources.get(entity.sourceId);

                // Get the value mapping for the entity
                const v4ValueMap = this.getV4ValueMapping(v4Element, entity);

                // Populate the parameters for the composite key. 
                // These should match the values that were inserted/updated originally.
                values.push([
                    entity.stationId,            // recordedFrom
                    entity.elementId,            // describedBy
                    v4ValueMap.v4DBDatetime,     // obsDatetime
                    v4ValueMap.v4Level,          // obsLevel
                    0,                           // qcStatus (as used in the upsert)
                    7,                           // acquisitionType (as used in the upsert)
                    sourceName                   // source name (as used in the upsert)                            
                ]);
            }

            // Execute the batch deletion.
            // Each set of parameters will run the DELETE statement.
            const results: mariadb.UpsertResult = await connection.batch(deleteStatement, values);

            this.logger.log(`V4 Delete status: ${JSON.stringify(results)}`);

            // Note:
            // If some of the keys do not exist in the database the affectedRows count may be lower
            // than the number of entities. So just return true
            return true;
        } catch (err) {
            this.logger.error('Error deleting observations from v4 initial table:', err);
            return false;
        } finally {
            if (connection) connection.release(); // Ensure the connection is returned to the pool
        }
    }

    public async updateV5DBWithNewV4SaveStatus(observationRepo: Repository<ObservationEntity>, observationsData: ObservationEntity[]): Promise<UpdateResult> {
        // Build an array of objects representing each composite primary key. 
        const compositeKeys = observationsData.map((obs) => ({
            stationId: obs.stationId,
            elementId: obs.elementId,
            level: obs.level,
            datetime: obs.datetime,
            interval: obs.interval,
            sourceId: obs.sourceId,
        }));

        // Use QueryBuilder's whereInIds to update all matching rows in a single query.
        return observationRepo
            .createQueryBuilder()
            .update(ObservationEntity)
            .set({ savedToV4: true })
            .whereInIds(compositeKeys)
            .execute();
    }




}
