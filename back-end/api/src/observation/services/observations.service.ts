import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, DeleteResult, Equal, FindManyOptions, FindOperator, FindOptionsWhere, In, LessThanOrEqual, MoreThanOrEqual, Repository, UpdateResult } from 'typeorm';
import { ObservationEntity, ViewObservationLogDto } from '../entities/observation.entity';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { ViewObservationDto } from '../dtos/view-observation.dto';
import { QCStatusEnum } from '../enums/qc-status.enum';
import { EntryFormObservationQueryDto } from '../dtos/entry-form-observation-query.dto';
import { ViewObservationLogQueryDto } from '../dtos/view-observation-log-query.dto';
import { DeleteObservationDto } from '../dtos/delete-observation.dto';
import { ClimsoftWebToV4SyncService } from './climsoft-web-to-v4-sync.service';
import { UsersService } from 'src/user/services/users.service';
import { StationStatusQueryDto } from '../dtos/station-status-query.dto';
import { StationStatusDataQueryDto } from '../dtos/station-status-data-query.dto';
import { DataAvailabilitySummaryQueryDto } from '../dtos/data-availability-summary-query.dto';
import { StringUtils } from 'src/shared/utils/string.utils';
import { DataAvailabilityDetailQueryDto } from '../dtos/data-availability-detail-query.dto';

@Injectable()
export class ObservationsService {
    private readonly logger = new Logger(ClimsoftWebToV4SyncService.name);

    constructor(
        @InjectRepository(ObservationEntity) private observationRepo: Repository<ObservationEntity>,
        private dataSource: DataSource,
        private climsoftV4Service: ClimsoftWebToV4SyncService,
        private usersService: UsersService,
    ) { }

    public async findProcessed(selectObsevationDto: ViewObservationQueryDTO): Promise<ViewObservationDto[]> {
        const obsView: ViewObservationDto[] = [];
        const obsEntities = await this.findProcessedObsEntities(selectObsevationDto);
        for (const obsEntity of obsEntities) {
            const viewObs: ViewObservationDto = {
                stationId: obsEntity.stationId,
                elementId: obsEntity.elementId,
                sourceId: obsEntity.sourceId,
                level: obsEntity.level,
                interval: obsEntity.interval,
                datetime: obsEntity.datetime.toISOString(),
                value: obsEntity.value,
                flag: obsEntity.flag,
                comment: obsEntity.comment,
                entryDatetime: obsEntity.entryDateTime.toISOString()
            };
            obsView.push(viewObs);
        }

        return obsView;
    }


    private async findProcessedObsEntities(viewObsevationQueryDto: ViewObservationQueryDTO): Promise<ObservationEntity[]> {
        // TODO. This is a temporary check. Find out how we can do this at the dto validation level.
        if (!(viewObsevationQueryDto.page && viewObsevationQueryDto.pageSize && viewObsevationQueryDto.pageSize <= 1000)) {
            throw new BadRequestException("You must specify page and page size. Page size must be less than or equal to 1000")
        }

        const findOptions: FindManyOptions<ObservationEntity> = {
            order: {
                stationId: "ASC",
                elementId: "ASC",
                level: "ASC",
                datetime: "ASC",
                interval: "ASC",
            },
            where: this.getProcessedFilter(viewObsevationQueryDto),
            skip: (viewObsevationQueryDto.page - 1) * viewObsevationQueryDto.pageSize,
            take: viewObsevationQueryDto.pageSize
        };

        return this.observationRepo.find(findOptions);
    }

    public async count(selectObsevationDto: ViewObservationQueryDTO): Promise<number> {
        const whereOptions: FindOptionsWhere<ObservationEntity> = this.getProcessedFilter(selectObsevationDto);
        return this.observationRepo.countBy(whereOptions);
    }

    /**
     * Counts the number of records needed to be saved to V4.
     * Important note. Maximum count is 1,000,001 to limit compute needed
     * @returns 
     */
    public async countObservationsNotSavedToV4(): Promise<number> {
        return this.observationRepo.count({
            where: { savedToV4: false },
            take: 1000001, // Important. Limit to 1 million and 1 for performance reasons
        });
    }

    private getProcessedFilter(selectObsevationDto: ViewObservationQueryDTO): FindOptionsWhere<ObservationEntity> {
        const whereOptions: FindOptionsWhere<ObservationEntity> = {};

        if (selectObsevationDto.stationIds) {
            whereOptions.stationId = selectObsevationDto.stationIds.length === 1 ? selectObsevationDto.stationIds[0] : In(selectObsevationDto.stationIds);
        }

        if (selectObsevationDto.elementIds) {
            whereOptions.elementId = selectObsevationDto.elementIds.length === 1 ? selectObsevationDto.elementIds[0] : In(selectObsevationDto.elementIds);
        }

        if (selectObsevationDto.intervals) {
            whereOptions.interval = selectObsevationDto.intervals.length === 1 ? selectObsevationDto.intervals[0] : In(selectObsevationDto.intervals);
        }

        if (selectObsevationDto.level !== undefined) {
            whereOptions.level = selectObsevationDto.level;
        }

        if (selectObsevationDto.sourceIds) {
            whereOptions.sourceId = selectObsevationDto.sourceIds.length === 1 ? selectObsevationDto.sourceIds[0] : In(selectObsevationDto.sourceIds);
        }

        this.setProcessedObsDateFilter(selectObsevationDto, whereOptions);

        whereOptions.deleted = selectObsevationDto.deleted;

        return whereOptions;
    }

    private setProcessedObsDateFilter(selectObsevationDto: ViewObservationQueryDTO, selectOptions: FindOptionsWhere<ObservationEntity>) {
        let dateOperator: FindOperator<Date> | null = null;
        if (selectObsevationDto.fromDate && selectObsevationDto.toDate) {
            if (selectObsevationDto.fromDate === selectObsevationDto.toDate) {
                dateOperator = Equal(new Date(selectObsevationDto.fromDate));
            } else {
                dateOperator = Between(new Date(selectObsevationDto.fromDate), new Date(selectObsevationDto.toDate));
            }

        } else if (selectObsevationDto.fromDate) {
            dateOperator = MoreThanOrEqual(new Date(selectObsevationDto.fromDate));
        } else if (selectObsevationDto.toDate) {
            dateOperator = LessThanOrEqual(new Date(selectObsevationDto.toDate));
        }

        if (dateOperator !== null) {
            if (selectObsevationDto.useEntryDate) {
                selectOptions.entryDateTime = dateOperator;
            } else {
                selectOptions.datetime = dateOperator;
            }
        }

    }

    public async findFormData(queryDto: EntryFormObservationQueryDto): Promise<CreateObservationDto[]> {
        const entities: ObservationEntity[] = await this.observationRepo.findBy({
            stationId: queryDto.stationId,
            elementId: In(queryDto.elementIds),
            sourceId: queryDto.sourceId,
            level: queryDto.level,
            datetime: Between(new Date(queryDto.fromDate), new Date(queryDto.toDate)),
            //interval: queryDto.interval, // Note, interval is commented out because of cumulative data in entry forms
            deleted: false
        });

        const dtos: CreateObservationDto[] = entities.map(data => ({
            stationId: data.stationId,
            elementId: data.elementId,
            sourceId: data.sourceId,
            level: data.level,
            datetime: data.datetime.toISOString(),
            interval: data.interval,
            value: data.value,
            flag: data.flag,
            comment: data.comment,
        })
        );

        return dtos;
    }

    public async findCorrectionData(selectObsevationDto: ViewObservationQueryDTO): Promise<CreateObservationDto[]> {
        const entities = await this.findProcessedObsEntities(selectObsevationDto);
        const dtos: CreateObservationDto[] = entities.map(data => ({
            stationId: data.stationId,
            elementId: data.elementId,
            sourceId: data.sourceId,
            level: data.level,
            datetime: data.datetime.toISOString(),
            interval: data.interval,
            value: data.value,
            flag: data.flag,
            comment: data.comment,
        })
        );

        return dtos;
    }

    public async findObservationLog(queryDto: ViewObservationLogQueryDto): Promise<ViewObservationLogDto[]> {
        const entity: ObservationEntity | null = await this.observationRepo.findOneBy({
            stationId: queryDto.stationId,
            elementId: queryDto.elementId,
            sourceId: queryDto.sourceId,
            level: queryDto.level,
            interval: queryDto.interval,
            datetime: new Date(queryDto.datetime)
        });

        if (!entity) {
            throw new NotFoundException('Observation not found');
        }

        const viewLogDto: ViewObservationLogDto[] = [];
        if (entity.log) {
            for (const item of entity.log) {
                viewLogDto.push({
                    value: item.value,
                    flag: item.flag,
                    comment: item.comment,
                    deleted: item.deleted,
                    entryUserEmail: (await this.usersService.findOne(item.entryUserId)).email,
                    entryDateTime: item.entryDateTime,
                });
            }
        }

        // Include the current values as log.
        // Important because present values should be part of the record history
        const currentValuesAsLogObj: ViewObservationLogDto = {
            value: entity.value,
            flag: entity.flag,
            comment: entity.comment,
            deleted: entity.deleted,
            entryUserEmail: (await this.usersService.findOne(entity.entryUserId)).email,
            entryDateTime: entity.entryDateTime.toISOString()
        }

        viewLogDto.push(currentValuesAsLogObj);

        return viewLogDto;
    }

    /**
     * 
     * @param createObservationDtos 
     * @param userId 
     * @param ignoreV4Saving When true, observations will be indicated as already saved to v4 and they will not be uploaded to version 4 databse
     */
    public async bulkPut(createObservationDtos: CreateObservationDto[], userId: number, ignoreV4Saving: boolean = false): Promise<void> {
        let startTime = new Date().getTime();

        const obsEntities: ObservationEntity[] = [];
        for (const dto of createObservationDtos) {
            const entity: ObservationEntity = this.observationRepo.create({
                stationId: dto.stationId,
                elementId: dto.elementId,
                sourceId: dto.sourceId,
                level: dto.level,
                datetime: new Date(dto.datetime),
                interval: dto.interval,
                value: dto.value,
                flag: dto.flag,
                qcStatus: QCStatusEnum.NONE,
                comment: dto.comment,
                entryUserId: userId,
                deleted: false,
                savedToV4: ignoreV4Saving,
            });

            obsEntities.push(entity);
        }


        this.logger.log(`DTO transformation took: ${(new Date().getTime() - startTime)} milliseconds`);

        startTime = new Date().getTime();

        const batchSize = 1000; // batch size of 1000 seems to be safer (incase there are comments) and faster.
        for (let i = 0; i < obsEntities.length; i += batchSize) {
            const batch = obsEntities.slice(i, i + batchSize);
            await this.insertOrUpdateObsValues(this.observationRepo, batch);
        }
        this.logger.log(`Saving entities took: ${(new Date().getTime() - startTime)} milliseconds`);

        if (!ignoreV4Saving) {
            // Initiate saving to version 4 database as well
            this.climsoftV4Service.saveWebObservationstoV4DB();
        }

    }

    private async insertOrUpdateObsValues(observationRepo: Repository<ObservationEntity>, observationsData: ObservationEntity[]) {
        return observationRepo
            .createQueryBuilder()
            .insert()
            .into(ObservationEntity)
            .values(observationsData)
            .orUpdate(
                [
                    "value",
                    "flag",
                    "qc_status",
                    "comment",
                    "deleted",
                    "saved_to_v4",
                    "entry_user_id",
                ],
                [
                    "station_id",
                    "element_id",
                    "source_id",
                    "level",
                    "date_time",
                    "interval",
                ],
                {
                    skipUpdateIfNoValuesChanged: true,
                }
            )
            .execute();
    }

    public async softDelete(obsDtos: DeleteObservationDto[], userId: number): Promise<number> {
        return this.softDeleteOrRestore(obsDtos, true, userId)
    }

    public async restore(obsDtos: DeleteObservationDto[], userId: number): Promise<number> {
        return this.softDeleteOrRestore(obsDtos, false, userId)
    }

    private async softDeleteOrRestore(obsDtos: DeleteObservationDto[], deletedStatus: boolean, userId: number): Promise<number> {
        // Build an array of objects representing each composite primary key. 
        const compositeKeys = obsDtos.map((obs) => ({
            stationId: obs.stationId,
            elementId: obs.elementId,
            level: obs.level,
            datetime: obs.datetime,
            interval: obs.interval,
            sourceId: obs.sourceId,
        }));


        // Use QueryBuilder's whereInIds to update all matching rows in a single query.
        const updatedResults: UpdateResult = await this.observationRepo
            .createQueryBuilder()
            .update(ObservationEntity)
            .set({
                deleted: deletedStatus,
                savedToV4: false,
                entryUserId: userId,
            })
            .whereInIds(compositeKeys)
            .execute();

        console.log('Soft Deleted Observations: ', updatedResults);

        this.climsoftV4Service.saveWebObservationstoV4DB();

        // If affected results not supported then just return the dtos length.
        // Note, affected results will always be defined because the API uses postgres.
        return updatedResults.affected ? updatedResults.affected : obsDtos.length;
    }

    public async hardDelete(deleteObsDtos: DeleteObservationDto[]): Promise<number> {
        // Build an array of objects representing each composite primary key. 
        const compositeKeys = deleteObsDtos.map((obs) => ({
            stationId: obs.stationId,
            elementId: obs.elementId,
            level: obs.level,
            datetime: obs.datetime,
            interval: obs.interval,
            sourceId: obs.sourceId,
        }));

        // Use QueryBuilder's whereInIds to update all matching rows in a single query.
        const updatedResults: DeleteResult = await this.observationRepo.createQueryBuilder()
            .delete()
            .from(ObservationEntity)
            .whereInIds(compositeKeys)
            .execute();

        return updatedResults.affected ? updatedResults.affected : deleteObsDtos.length;
    }

    // NOTE. Left here for future reference. In fututure we want to be able to delete by station id and source id. 
    // This will be useful code to reuse.
    public async hardDeleteBy(deleteObsDtos: DeleteObservationDto[]): Promise<number> {
        let succesfulChanges: number = 0;
        for (const dto of deleteObsDtos) {
            const result = await this.observationRepo.createQueryBuilder()
                .delete()
                .from(ObservationEntity)
                .where('station_id = :station_id', { station_id: dto.stationId })
                .andWhere('element_id = :element_id', { element_id: dto.elementId })
                .andWhere('level = :level', { level: dto.level })
                .andWhere('date_time = :date_time', { date_time: dto.datetime })
                .andWhere('interval = :interval', { interval: dto.interval })
                .andWhere('source_id = :source_id', { source_id: dto.sourceId })
                .execute();

            if (result.affected) {
                succesfulChanges = succesfulChanges + 1;
            }
        }

        return succesfulChanges;
    }

    public async findStationsObservationStatus(stationStatusQuery: StationStatusQueryDto): Promise<string[]> {
        const durationType: 'HOURS' | 'DAYS' = stationStatusQuery.durationType === 'hours' ? 'HOURS' : 'DAYS';
        const duration: number = stationStatusQuery.duration;
        let extraSQLCondition: string = '';
        if (stationStatusQuery.stationIds && stationStatusQuery.stationIds.length > 0) {
            extraSQLCondition = extraSQLCondition + ` AND station_id IN (${stationStatusQuery.stationIds.map(id => `'${id}'`).join(',')})`;
        }

        if (stationStatusQuery.elementId !== undefined && stationStatusQuery.elementId > 0) {
            extraSQLCondition = extraSQLCondition + ` AND element_id = ${stationStatusQuery.elementId}`;
        }

        const results = await this.dataSource.manager.query(
            `
            SELECT DISTINCT station_id 
            FROM observations 
            WHERE deleted = FALSE AND date_time >= NOW() - INTERVAL '${duration} ${durationType}' ${extraSQLCondition};
            `);

        return results.map((item: { station_id: any; }) => item.station_id);
    }

    public async findStationsObservationStatusData(stationId: string, stationStatusQuery: StationStatusDataQueryDto): Promise<{ elementId: number, level: number, datetime: string, interval: number, sourceId: number, value: number | null, flag: string | null }[]> {
        const durationType: 'HOURS' | 'DAYS' = stationStatusQuery.durationType === 'hours' ? 'HOURS' : 'DAYS';
        const duration: number = stationStatusQuery.duration;

        let extraSQLCondition: string = '';
        if (stationStatusQuery.elementId !== undefined && stationStatusQuery.elementId > 0) {
            extraSQLCondition = extraSQLCondition + ` AND o.element_id = ${stationStatusQuery.elementId}`;
        }

        const results = await this.dataSource.manager.query(
            `
            SELECT o.element_id AS "elementId", o."level" AS "level", o.date_time AS "datetime", o."interval" AS "interval", o.source_id AS "sourceId", o.value AS "value", o.flag AS "flag" 
            FROM observations o 
            WHERE o.deleted = FALSE AND o.station_id = '${stationId}' AND o.date_time >= NOW() - INTERVAL '${duration} ${durationType}' ${extraSQLCondition}
            ORDER BY o.element_id, o.date_time;
            `);


        // Return the path to the generated CSV file
        return results;
    }

    public async findDataAvailabilitySummary(dataAvailabilityQuery: DataAvailabilitySummaryQueryDto): Promise<{ stationId: string; recordCount: number; dateValue: number }[]> {
        let extractSQL: string = '';
        let extraSQLCondition: string = '';
        let groupAndOrderBySQL: string = '';

        if (dataAvailabilityQuery.stationIds && dataAvailabilityQuery.stationIds.length > 0) {
            extraSQLCondition = extraSQLCondition + ` AND station_id IN (${dataAvailabilityQuery.stationIds.map(id => `'${id}'`).join(',')})`;
        }

        extraSQLCondition = extraSQLCondition + ` AND element_id = ${dataAvailabilityQuery.elementId}`;
        extraSQLCondition = extraSQLCondition + ` AND interval = ${dataAvailabilityQuery.interval}`;

        let year: number;
        let month: number;
        let startDate: string;
        let endDate: string;

        switch (dataAvailabilityQuery.durationType) {
            case 'days_of_month':
                //Group by Day of Month e.g `SELECT station_id, COUNT(*) AS record_count, EXTRACT(DAY FROM date_time) AS day_of_month FROM observations WHERE element_id = 1001 AND interval = 1440 AND date_time >= DATE '2025-01-01' AND date_time < DATE '2025-02-01' GROUP BY station_id, day_of_month ORDER BY station_id, day_of_month;`

                const splitYearMonth: string[] = dataAvailabilityQuery.durationDaysOfMonth.split('-');
                year = Number(splitYearMonth[0]);
                month = Number(splitYearMonth[1]);
                if (month >= 12) {
                    year = year + 1;
                    month = 1;
                } else {
                    month = month + 1;
                }
                startDate = `${dataAvailabilityQuery.durationDaysOfMonth}-01`;
                endDate = `${year}-${StringUtils.addLeadingZero(month)}-01`;

                extractSQL = `EXTRACT(DAY FROM date_time) AS extracted_date_value`;
                extraSQLCondition = extraSQLCondition + ` AND date_time >= DATE '${startDate}' AND date_time < DATE '${endDate}'`;
                groupAndOrderBySQL = `GROUP BY station_id, extracted_date_value ORDER BY station_id, extracted_date_value;`;
                break;
            case 'months_of_year':
                // Group by Month e.g `SELECT station_id, COUNT(*) AS record_count, EXTRACT(MONTH FROM date_time) AS month FROM observations WHERE element_id = 1001 AND interval = 1440 AND date_time >= DATE '2025-01-01'AND date_time < DATE '2026-01-01' GROUP BY station_id, month ORDER BY station_id, month;`

                year = dataAvailabilityQuery.durationMonthsOfYear;
                startDate = `${year}-01-01`;
                endDate = `${year + 1}-01-01`;
                extractSQL = `EXTRACT(MONTH FROM date_time) AS extracted_date_value`;
                extraSQLCondition = extraSQLCondition + ` AND date_time >= DATE '${startDate}' AND date_time < DATE '${endDate}'`;
                groupAndOrderBySQL = `GROUP BY station_id, extracted_date_value ORDER BY station_id, extracted_date_value`;
                break;
            case 'years':
                //Group by Year e.g `SELECT station_id, COUNT(*) AS record_count, EXTRACT(YEAR FROM date_time) AS year FROM observations WHERE element_id = 1001 AND interval = 'hourly' AND EXTRACT(YEAR FROM date_time) IN (2024, 2025) GROUP BY station_id, year ORDER BY station_id, year;`

                extractSQL = `EXTRACT(YEAR FROM date_time) AS extracted_date_value`;
                extraSQLCondition = extraSQLCondition + ` AND EXTRACT(YEAR FROM date_time) IN (${dataAvailabilityQuery.durationYears.join(',')})  `;
                groupAndOrderBySQL = `GROUP BY station_id, extracted_date_value ORDER BY station_id, extracted_date_value`
                break;
            default:
                break;
        }

        const results = await this.dataSource.manager.query(
            `
            SELECT station_id, COUNT(*) AS record_count, ${extractSQL} FROM observations 
            WHERE deleted = FALSE  ${extraSQLCondition} ${groupAndOrderBySQL};
            `);

        //console.log('results: ', results)

        return results.map((item: { station_id: string; record_count: number; extracted_date_value: number; }) => {
            return { stationId: item.station_id, recordCount: Number(item.record_count), dateValue: Number(item.extracted_date_value) };
        });
    }

    // public async findDataAvailabilityDetail(dataAvailabilityQuery: DataAvailabilityDetailQueryDto): Promise<{ stationId: string; recordCount: number; dateValue: number }[]> {

    //     let extraSQLCondition: string = '';
    //     let groupAndOrderBySQL: string = '';

    //     extraSQLCondition = ` AND station_id = ${dataAvailabilityQuery.stationId}`;
    //     extraSQLCondition = extraSQLCondition + ` AND element_id = ${dataAvailabilityQuery.elementId}`;
    //     extraSQLCondition = extraSQLCondition + ` AND interval = ${dataAvailabilityQuery.interval}`;

    //     let year: number;
    //     let month: number;
    //     let startDate: string;
    //     let endDate: string;

    //     switch (dataAvailabilityQuery.durationType) {
    //         case 'days_of_month':
    //             //Group by Day of Month e.g `SELECT station_id, COUNT(*) AS record_count, EXTRACT(DAY FROM date_time) AS day_of_month FROM observations WHERE element_id = 1001 AND interval = 1440 AND date_time >= DATE '2025-01-01' AND date_time < DATE '2025-02-01' GROUP BY station_id, day_of_month ORDER BY station_id, day_of_month;`

    //             const splitYearMonth: string[] = dataAvailabilityQuery.durationDaysOfMonth.split('-');
    //             year = Number(splitYearMonth[0]);
    //             month = Number(splitYearMonth[1]);
    //             if (month >= 12) {
    //                 year = year + 1;
    //                 month = 1;
    //             } else {
    //                 month = month + 1;
    //             }
    //             startDate = `${dataAvailabilityQuery.durationDayOfMonth}-01`;
    //             endDate = `${year}-${StringUtils.addLeadingZero(month)}-01`;
    //             extraSQLCondition = extraSQLCondition + ` AND date_time >= '${dataAvailabilityQuery.durationDayOfMonth}`; 
    //             break;
    //         case 'months_of_year': 
    //             year = dataAvailabilityQuery.durationMonthsOfYear;
    //             startDate = `${year}-01-01`;
    //             endDate = `${year + 1}-01-01`; 
    //             extraSQLCondition = extraSQLCondition + ` AND date_time >= DATE '${startDate}' AND date_time < DATE '${endDate}'`; 
    //             break;
    //         case 'years': 
    //             extraSQLCondition = extraSQLCondition + ` AND EXTRACT(YEAR FROM date_time) IN (${dataAvailabilityQuery.durationYears.join(',')})  `; 
    //             break;
    //         default:
    //             break;
    //     }


    //     const results = await this.dataSource.manager.query(
    //         `
    //         SELECT o.element_id AS "elementId", o."level" AS "level", o.date_time AS "datetime", o."interval" AS "interval", o.source_id AS "sourceId", o.value AS "value", o.flag AS "flag" 
    //         FROM observations o 
    //         WHERE o.deleted = FALSE AND o.station_id = '${dataAvailabilityQuery.stat}' AND o.date_time >= NOW() - INTERVAL '${duration} ${durationType}' ${extraSQLCondition}
    //         ORDER BY o.element_id, o.date_time;
    //         `);

    //     //console.log('results: ', results)

    //     return results.map((item: { station_id: string; record_count: number; extracted_date_value: number; }) => {
    //         return { stationId: item.station_id, recordCount: Number(item.record_count), dateValue: Number(item.extracted_date_value) };
    //     });
    // }


}
