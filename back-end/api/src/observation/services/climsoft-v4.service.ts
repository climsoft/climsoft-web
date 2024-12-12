import { Injectable } from '@nestjs/common';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import * as mariadb from 'mariadb';
import { GeneralSettingsService } from 'src/settings/services/general-settings.service';
import { ClimsoftV4DBDto } from 'src/settings/dtos/settings/climsoft-v4-db.dto';
import { GeneralSettingsDefaults } from 'src/migrations/general-settings-defaults';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/elements/create-view-element.dto'; 

@Injectable()
export class ClimsoftV4Service {
    private v4DBPool: mariadb.Pool;
    private v4Setting: ClimsoftV4DBDto;
    private v4v5Mappings: { v4Id: number, v5Id: number, v4Period: 'daily' | 'hourly' }[];
    private requiredV5elements: CreateViewElementDto[];

    constructor(
        private generalSettingsService: GeneralSettingsService,
        private elementsService: ElementsService,) {
    }

    private async v4DBIsSetup(): Promise<boolean> {
        // If setting not loaded then load it
        if (!this.v4Setting) {
            this.v4Setting = (await this.generalSettingsService.find(1)).parameters as ClimsoftV4DBDto;
        }

        // if saving to v4 database not allowed then return null
        if (!this.v4Setting.saveToV4DB) {
            return false;
        }

        // Get V4 and v5 mappings if not loaded yet
        if (!this.v4v5Mappings) {
            this.v4v5Mappings = GeneralSettingsDefaults.V4_V5_ELEMENTS_MAPPER;
        }

        // Get the v5 elements metadata. only those that are required
        if (!this.requiredV5elements) {
            this.requiredV5elements = await this.elementsService.find({ elementIds: this.v4v5Mappings.map(item => item.v5Id) });
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

    public async saveObservations(createObservationDtos: CreateObservationDto[], username: string) {

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

                const values: (string | number | null)[][] = [];
                for (const dto of batch) {

                    const v4ValueMap = this.getV4ValueMapping(dto);
                    if (!v4ValueMap) {
                        continue;
                    }

                    values.push([
                        dto.stationId,
                        v4ValueMap.v4DBElementId,
                        v4ValueMap.v4DBDatetime,
                        'surface',
                        v4ValueMap.v4ScaledValue,
                        dto.flag ,
                        v4ValueMap.v4DBPeriod, // period
                        0, // qcStatus
                        null, // qcTypeLog
                        7, // acquisitionType
                        null, // dataForm
                        username
                    ]);

                }


                // const values = batch.map(dto => [
                //     dto.stationId,
                //     dto.elementId,
                //     this.getV4AdjustedDatetimeInDBFormat(dto.datetime),
                //     'surface',
                //     dto.value === null ? null : dto.value,
                //     dto.flag === null ? null : dto.flag,
                //     null, // period
                //     0, // qcStatus
                //     null, // qcTypeLog
                //     7, // acquisitionType
                //     null, // dataForm
                //     username
                // ]);

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

    private getV4ValueMapping(dto: CreateObservationDto): { v4DBElementId: number, v4DBPeriod: number | null, v4ScaledValue: number | null, v4DBDatetime: string } | null {
        const v4Mappings = this.v4v5Mappings.find(item => item.v4Id === dto.elementId);
        if (!v4Mappings) {
            return null;
        }

        const element = this.requiredV5elements.find(item => item.id === dto.elementId);
        const v4ElementId = v4Mappings.v4Id;
        const period: number | null = (v4Mappings.v4Period === 'daily') ? (dto.period / 1440) : null;
        const scaledValue: number | null = (element && element.entryScaleFactor && dto.value) ? (element.entryScaleFactor * dto.value) : dto.value;
        const adjustedDatetime: string = this.getV4AdjustedDatetimeInDBFormat(dto.datetime);

        return { v4DBElementId: v4ElementId, v4DBPeriod: period, v4ScaledValue: scaledValue, v4DBDatetime: adjustedDatetime };
    }


    private getV4AdjustedDatetimeInDBFormat(strDatetimeInUtc: string): string {
        const dateAdjusted = new Date(strDatetimeInUtc);
        dateAdjusted.setHours(dateAdjusted.getHours() + this.v4Setting.utcOffset);
        return dateAdjusted.toISOString().replace('T', ' ').replace('Z', '')
    }



}
