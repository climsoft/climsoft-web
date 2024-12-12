import { Injectable } from '@nestjs/common';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import * as mariadb from 'mariadb';
import { GeneralSettingsService } from 'src/settings/services/general-settings.service'; 
import { ClimsoftV4DBDto } from 'src/settings/dtos/settings/climsoft-v4-db.dto';

@Injectable()
export class ClimsoftV4Service {
    private v4Setting: ClimsoftV4DBDto;
    private v4DBPool: mariadb.Pool;

    constructor(private generalSettingsService: GeneralSettingsService) { }

    private async v4DBIsSetup(): Promise<boolean> {
        // If setting not loaded then load it
        if (!this.v4Setting) {
            this.v4Setting = (await this.generalSettingsService.find(1)).parameters as ClimsoftV4DBDto;
        }

        // if saving to v4 database not allowed then return null
        if (!this.v4Setting.saveToV4DB) {
            return false;
        } 

        // If the version 4 database pool is not set up then set it up.
        if (!this.v4DBPool) {
            try {
            // create v4 database connection pool
            this.v4DBPool = mariadb.createPool({
                host: this.v4Setting.serverIPAddress,
                user: this.v4Setting.username,
                password: this.v4Setting.password,
                database: this.v4Setting.databaseName,
                port: this.v4Setting.port
            });     
            } catch (error) {
               console.error('Setting up mariadb for V4 database failed: ', error); 
               return false;
            }    
        }

        return true;
    }

    public async saveObservation(createObservationDtos: CreateObservationDto[], username: string) {

        // TODO. Later remove this.
        if (1 === 1) {
            return;
        }

        // if version 4 database pool is not set up then return.
        if (!(await this.v4DBIsSetup())) {
            return;
        }

        // Get a connection from the pool
        const connection = await this.v4DBPool.getConnection();
        try {
            const batchSize = 1000;
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
                    obsLevel = VALUES(obsLevel),
                    obsValue = VALUES(obsValue),
                    flag = VALUES(flag),
                    period = VALUES(period),
                    qcStatus = VALUES(qcStatus),
                    qcTypeLog = VALUES(qcTypeLog),
                    acquisitionType = VALUES(acquisitionType),
                    dataForm = VALUES(dataForm),
                    capturedBy = VALUES(capturedBy)
            `;

            for (let i = 0; i < createObservationDtos.length; i += batchSize) {
                const batch = createObservationDtos.slice(i, i + batchSize);

                const values = batch.map(dto => [
                    dto.stationId,
                    dto.elementId,
                    dto.datetime.replace('T', ' ').replace('Z', ''),
                    'surface',
                    dto.value === null ? null : dto.value,
                    dto.flag === null ? null : dto.flag,
                    null, // period
                    0, // qcStatus
                    null, // qcTypeLog
                    7, // acquisitionType
                    null, // dataForm
                    username
                ]);

                // Execute the batch upsert
                await connection.batch(upsertStatement, values);
            }
        } catch (err) {
            console.error('Error saving observations to v4 initial table:', err);
            //throw err;
        } finally {
            if (connection) connection.release(); // Ensure the connection is released back to the pool
        }
    }

}
