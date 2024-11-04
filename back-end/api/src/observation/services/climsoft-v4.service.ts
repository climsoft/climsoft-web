import { Injectable } from '@nestjs/common';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import * as mariadb from 'mariadb';

@Injectable()
export class ClimsoftV4Service {

    private v4DBInitialised: boolean = false;
    private v4DBPool: mariadb.Pool;

    private async setupV4DBConnections() {
        this.v4DBPool = mariadb.createPool({
            host: process.env.V4_HOST ? process.env.V4_HOST : "localhost",        // e.g., 'localhost' or the server's IP address
            user: process.env.V4_DB_USERNAME ? process.env.V4_DB_USERNAME : "my_user",    // MariaDB username
            password: process.env.V4_DB_PASSWORD ? process.env.V4_DB_PASSWORD : "my_password", // MariaDB password
            database: process.env.V4_DB_NAME ? process.env.V4_DB_NAME : "mariadb_climsoft_test_db_v4", // MariaDB database name 
            port: process.env.DB_PORT ? +process.env.DB_PORT : 3306
        });
    }

    public async saveObservation(createObservationDtos: CreateObservationDto[], username: string) {

        // TODO. Later remove this.
        if (1 === 1) {
            return;
        }

        if (!this.v4DBInitialised) {
            await this.setupV4DBConnections();
            this.v4DBInitialised = true;
        }

        let connection;
        try {
            // Get a connection from the pool
            connection = await this.v4DBPool.getConnection();

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
