import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, DeleteResult, Equal, FindManyOptions, FindOperator, FindOptionsWhere, In, LessThanOrEqual, MoreThanOrEqual, Repository, UpdateResult } from 'typeorm';
import { ObservationEntity } from '../entities/observation.entity';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { ViewObservationDto } from '../dtos/view-observation.dto';
import { QCStatusEnum } from '../enums/qc-status.enum';
import { EntryFormObservationQueryDto } from '../dtos/entry-form-observation-query.dto';
import { DeleteObservationDto } from '../dtos/delete-observation.dto';
import { ClimsoftWebToV4SyncService } from './climsoft-web-to-v4-sync.service';
import { UsersService } from 'src/user/services/users.service';
import { StationStatusQueryDto } from '../dtos/station-status-query.dto';
import { StationStatusDataQueryDto } from '../dtos/station-status-data-query.dto';
import { DataAvailabilitySummaryQueryDto } from '../dtos/data-availability-summary-query.dto';
import { GeneralSettingsService } from 'src/settings/services/general-settings.service';
import { SettingIdEnum } from 'src/settings/dtos/setting-id.enum';
import { ClimsoftDisplayTimeZoneDto } from 'src/settings/dtos/settings/climsoft-display-timezone.dto';
import { DateUtils } from 'src/shared/utils/date.utils';
import { DataFlowQueryDto } from '../dtos/data-flow-query.dto';
import { ViewObservationLogDto } from '../dtos/view-observation-log.dto';
import { ViewUserDto } from 'src/user/dtos/view-user.dto';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class ObservationsService {
    private readonly logger = new Logger(ObservationsService.name);
    private users: Map<number, ViewUserDto> = new Map();

    constructor(
        @InjectRepository(ObservationEntity) private observationRepo: Repository<ObservationEntity>,
        private dataSource: DataSource,
        private climsoftV4Service: ClimsoftWebToV4SyncService,
        private usersService: UsersService,
        private generalSettingsService: GeneralSettingsService,
    ) {
        this.resetLoadedusers();
    }

    @OnEvent('user.created')
    handleSourceCreated(payload: { id: number; dto: any }) {
        console.log(`user created: ID ${payload.id}`);

        this.resetLoadedusers();
    }

    @OnEvent('user.updated')
    handleSourceUpdated(payload: { id: number; dto: any }) {
        console.log(`user updated: ID ${payload.id}`);
        this.resetLoadedusers();
    }

    @OnEvent('user.deleted')
    handleSourceDeleted(payload: { id: number }) {
        console.log(`user deleted: ID ${payload.id}`);
        this.resetLoadedusers();
    }

    private async resetLoadedusers() {
        this.users.clear();
        const newUsers: ViewUserDto[] = await this.usersService.findAll();
        for (const user of newUsers) {
            this.users.set(user.id, user);
        }
    }

    public async findFormData(queryDto: EntryFormObservationQueryDto): Promise<CreateObservationDto[]> {
        const entities: ObservationEntity[] = await this.observationRepo.findBy({
            stationId: queryDto.stationId,
            elementId: In(queryDto.elementIds),
            sourceId: queryDto.sourceId,
            level: queryDto.level,
            datetime: Between(new Date(queryDto.fromDate), new Date(queryDto.toDate)),
            // Note, interval is commented out because of cumulative data in entry forms
            // Once its agreed to deprecate changing of interval at form level. Then merge findFormData and findProcessed functions.
            //interval: queryDto.interval, 
            deleted: false,
        });

        return this.createViewObsDtos(entities);
    }

    public async findProcessed(queryDto: ViewObservationQueryDTO): Promise<ViewObservationDto[]> {
        return this.createViewObsDtos(await this.findProcessedObsEntities(queryDto));
    }

    private async createViewObsDtos(obsEntities: ObservationEntity[]): Promise<ViewObservationDto[]> {
        const obsView: ViewObservationDto[] = [];
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
                qcStatus: obsEntity.qcStatus,
                qcTestLog: obsEntity.qcTestLog,
                log: this.createViewLog(obsEntity),
                entryDatetime: obsEntity.entryDateTime.toISOString(),
            };
            obsView.push(viewObs);
        }
        return obsView;
    }

    private createViewLog(entity: ObservationEntity): ViewObservationLogDto[] {
        const viewLogDto: ViewObservationLogDto[] = [];
        let user: ViewUserDto | undefined;
        if (entity.log) {
            for (const logItem of entity.log) {
                user = this.users.get(logItem.entryUserId);
                viewLogDto.push({
                    value: logItem.value,
                    flag: logItem.flag,
                    qcStatus: logItem.qcStatus,
                    comment: logItem.comment,
                    deleted: logItem.deleted,
                    entryUserName: user ? user.name : '',
                    entryUserEmail: user ? user.email : '',
                    entryDateTime: logItem.entryDateTime,
                });
            }
        }

        // Include the current values as log.
        // Important because present values should be part of the record history
        user = this.users.get(entity.entryUserId);
        const currentValuesAsLogObj: ViewObservationLogDto = {
            value: entity.value,
            flag: entity.flag,
            qcStatus: entity.qcStatus,
            comment: entity.comment,
            deleted: entity.deleted,
            entryUserName: user ? user.name : '',
            entryUserEmail: user ? user.email : '',
            entryDateTime: entity.entryDateTime.toISOString()
        }

        viewLogDto.push(currentValuesAsLogObj);
        return viewLogDto;
    }

    public async findProcessedObsEntities(queryDto: ViewObservationQueryDTO): Promise<ObservationEntity[]> {
        // TODO. This is a temporary check. Find out how we can do this at the dto validation level.
        // TODO. Move this check else where so that this function can be universally applicable
        if (!(queryDto.page && queryDto.pageSize && queryDto.pageSize <= 1000)) {
            throw new BadRequestException("You must specify page and page size. Page size must be less than or equal to 1000")
        }

        const findOptions: FindManyOptions<ObservationEntity> = {
            order: {
                datetime: "ASC", // Sort by date time first
                stationId: "ASC",
                elementId: "ASC",
                interval: "ASC",
                level: "ASC",
            },
            where: this.getProcessedFilter(queryDto),
            skip: (queryDto.page - 1) * queryDto.pageSize,
            take: queryDto.pageSize
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

    private getProcessedFilter(queryDto: ViewObservationQueryDTO): FindOptionsWhere<ObservationEntity> {
        const whereOptions: FindOptionsWhere<ObservationEntity> = {};

        if (queryDto.stationIds) {
            whereOptions.stationId = queryDto.stationIds.length === 1 ? queryDto.stationIds[0] : In(queryDto.stationIds);
        }

        if (queryDto.elementIds) {
            whereOptions.elementId = queryDto.elementIds.length === 1 ? queryDto.elementIds[0] : In(queryDto.elementIds);
        }

        if (queryDto.level !== undefined) {
            whereOptions.level = queryDto.level;
        }

        if (queryDto.intervals) {
            whereOptions.interval = queryDto.intervals.length === 1 ? queryDto.intervals[0] : In(queryDto.intervals);
        }

        if (queryDto.sourceIds) {
            whereOptions.sourceId = queryDto.sourceIds.length === 1 ? queryDto.sourceIds[0] : In(queryDto.sourceIds);
        }

        this.setProcessedObsDateFilter(queryDto, whereOptions);

        if (queryDto.qcStatus) {
            whereOptions.qcStatus = queryDto.qcStatus;
        }

        whereOptions.deleted = queryDto.deleted;

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

    /**
     * 
     * @param createObservationDtos 
     * @param userId 
     * @param ignoreV4Saving When true, observations will be indicated as already saved to v4 and they will not be uploaded to version 4 databse
     */
    public async bulkPut(createObservationDtos: CreateObservationDto[], userId: number, qcStatus = QCStatusEnum.NONE, ignoreV4Saving: boolean = false): Promise<void> {
        let startTime = new Date().getTime();

        const obsEntities: ObservationEntity[] = [];
        for (const dto of createObservationDtos) {
            const entity: ObservationEntity = this.observationRepo.create({
                stationId: dto.stationId,
                elementId: dto.elementId,
                level: dto.level,
                sourceId: dto.sourceId,
                datetime: new Date(dto.datetime),
                interval: dto.interval,
                value: dto.value,
                flag: dto.flag,
                qcStatus: qcStatus,
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
                    "level",
                    "source_id",
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

    public async findStationsStatus(stationStatusQuery: StationStatusQueryDto): Promise<string[]> {
        const durationType: 'HOURS' | 'DAYS' = stationStatusQuery.durationType === 'hours' ? 'HOURS' : 'DAYS';
        const duration: number = stationStatusQuery.duration;
        let extraSQLCondition: string = '';
        if (stationStatusQuery.stationIds && stationStatusQuery.stationIds.length > 0) {
            extraSQLCondition = extraSQLCondition + `station_id IN (${stationStatusQuery.stationIds.map(id => `'${id}'`).join(',')}) AND `;
        }

        if (stationStatusQuery.elementId !== undefined && stationStatusQuery.elementId > 0) {
            extraSQLCondition = extraSQLCondition + ` element_id = ${stationStatusQuery.elementId} AND `;
        }

        const results = await this.dataSource.manager.query(
            `
            SELECT DISTINCT station_id 
            FROM observations 
            WHERE ${extraSQLCondition} date_time >= NOW() - INTERVAL '${duration} ${durationType}' AND deleted = FALSE;
            `);

        return results.map((item: { station_id: any; }) => item.station_id);
    }

    public async findStationsStatusData(stationId: string, stationStatusQuery: StationStatusDataQueryDto): Promise<{ elementId: number, level: number, datetime: string, interval: number, sourceId: number, value: number | null, flag: string | null }[]> {
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
            WHERE o.station_id = '${stationId}' ${extraSQLCondition} AND o.date_time >= NOW() - INTERVAL '${duration} ${durationType}' AND o.deleted = FALSE 
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
            extraSQLCondition = `${extraSQLCondition} station_id IN (${dataAvailabilityQuery.stationIds.map(id => `'${id}'`).join(',')}) AND `;
        }

        if (dataAvailabilityQuery.elementIds && dataAvailabilityQuery.elementIds.length > 0) {
            extraSQLCondition = `${extraSQLCondition} element_id IN (${dataAvailabilityQuery.elementIds.join(',')}) AND `;
        }

        if (dataAvailabilityQuery.level !== undefined) {
            extraSQLCondition = `${extraSQLCondition} level = ${dataAvailabilityQuery.level} AND `;
        }

        if (dataAvailabilityQuery.interval) {
            extraSQLCondition = `${extraSQLCondition} interval = ${dataAvailabilityQuery.interval} AND `;
        }

        if (dataAvailabilityQuery.excludeMissingValues) {
            extraSQLCondition = `${extraSQLCondition} value IS NOT NULL AND `;
        }

        let year: number;
        let month: number;
        let startDate: string;
        let endDate: string;

        const utcOffset: number = ((await this.generalSettingsService.find(SettingIdEnum.DISPLAY_TIME_ZONE)).parameters as ClimsoftDisplayTimeZoneDto).utcOffset
        const strTimeZone: string = `'UTC+${utcOffset}'`;

        switch (dataAvailabilityQuery.durationType) {
            case 'days_of_month':
                if (!dataAvailabilityQuery.durationDaysOfMonth) throw new BadRequestException('Duration not povided');
                const splitYearMonth: string[] = dataAvailabilityQuery.durationDaysOfMonth.split('-');
                year = Number(splitYearMonth[0]);
                month = Number(splitYearMonth[1]);

                // Note month is 1 based here. So month 1 will refer to march once inside Date object because date objects month index are 0 based
                const lastEndDateDay: number = new Date(year, month, 0).getDate();
                startDate = DateUtils.getDatetimesBasedOnUTCOffset(
                    `${dataAvailabilityQuery.durationDaysOfMonth}-01T00:00:00Z`, utcOffset, 'subtract'
                ).replace('T', ' ').replace('Z', '');

                endDate = DateUtils.getDatetimesBasedOnUTCOffset(
                    `${dataAvailabilityQuery.durationDaysOfMonth}-${lastEndDateDay}T23:59:00Z`, utcOffset, 'subtract'
                ).replace('T', ' ').replace('Z', '');

                extractSQL = `EXTRACT(DAY FROM (date_time AT TIME ZONE 'UTC' AT TIME ZONE ${strTimeZone})) AS extracted_date_value`;
                extraSQLCondition = extraSQLCondition + ` date_time BETWEEN '${startDate}' AND '${endDate}' AND `;
                groupAndOrderBySQL = `GROUP BY station_id, extracted_date_value ORDER BY station_id, extracted_date_value`;

                //TODO. Investigate at time zone SQL more

                // const lastEndDateDay: number = DateUtils.getLastDayOfMonth(year, month);
                // startDate = `'${dataAvailabilityQuery.durationDaysOfMonth}-01 00:00:00'`;
                // endDate =  `'${dataAvailabilityQuery.durationDaysOfMonth}-${lastEndDateDay} 23:59:00'`;

                // extractSQL = `EXTRACT(DAY FROM (date_time AT TIME ZONE 'UTC' AT TIME ZONE ${strTimeZone})) AS extracted_date_value`;
                // extraSQLCondition = extraSQLCondition + `  date_time BETWEEN  ( (${startDate}::timestamptz) AT TIME ZONE ${strTimeZone}) AND ( (${endDate}::timestamptz) AT TIME ZONE ${strTimeZone})`;
                // groupAndOrderBySQL = `GROUP BY station_id, extracted_date_value ORDER BY station_id, extracted_date_value`;
                break;
            case 'months_of_year':
                if (!dataAvailabilityQuery.durationMonthsOfYear) throw new BadRequestException('Duration not povided');
                year = dataAvailabilityQuery.durationMonthsOfYear;
                startDate = DateUtils.getDatetimesBasedOnUTCOffset(
                    `${year}-01-01T00:00:00Z`, utcOffset, 'subtract'
                ).replace('T', ' ').replace('Z', '');

                endDate = DateUtils.getDatetimesBasedOnUTCOffset(
                    `${year}-12-31T23:59:00Z`, utcOffset, 'subtract'
                ).replace('T', ' ').replace('Z', '');

                extractSQL = `EXTRACT(MONTH FROM (date_time AT TIME ZONE 'UTC' AT TIME ZONE ${strTimeZone})) AS extracted_date_value`;
                extraSQLCondition = `${extraSQLCondition} date_time BETWEEN '${startDate}' AND '${endDate}' AND `;
                groupAndOrderBySQL = `GROUP BY station_id, extracted_date_value ORDER BY station_id, extracted_date_value`;
                break;
            case 'years':
                if (!dataAvailabilityQuery.durationYears) throw new BadRequestException('Duration not povided');
                const years: number[] = dataAvailabilityQuery.durationYears;
                extractSQL = `EXTRACT(YEAR FROM (date_time AT TIME ZONE 'UTC' AT TIME ZONE ${strTimeZone})) AS extracted_date_value`;
                extraSQLCondition = `${extraSQLCondition}  
                  EXTRACT(YEAR FROM (date_time AT TIME ZONE 'UTC' AT TIME ZONE ${strTimeZone})) IN (${years.join(',')}) AND `;
                groupAndOrderBySQL = `GROUP BY station_id, extracted_date_value ORDER BY station_id, extracted_date_value`;
                break;
            default:
                throw new BadRequestException('Duration type not supported');
        }

        const sql = `
            SELECT station_id, COUNT(element_id) AS record_count, ${extractSQL} FROM observations 
            WHERE ${extraSQLCondition} deleted = FALSE ${groupAndOrderBySQL};
            `

        //console.log(sql)

        const results = await this.dataSource.manager.query(sql);

        //console.log('results: ', results)

        return results.map((item: { station_id: string; record_count: number; extracted_date_value: number; }) => {
            return { stationId: item.station_id, recordCount: Number(item.record_count), dateValue: Number(item.extracted_date_value) };
        });
    }

    public async findDataFlow(queryDto: DataFlowQueryDto): Promise<ViewObservationDto[]> {
        // Important. limit the date selection to 10 years for perfomance reasons
        //TODO. Later find a way of doing this at the DTO level
        if (queryDto.fromDate && queryDto.toDate) {
            if (DateUtils.isMoreThanTenCalendarYears(new Date(queryDto.fromDate), new Date(queryDto.toDate))) {
                throw new BadRequestException('Date range exceeds 10 years');
            }
        } else {
            throw new BadRequestException('Date range required');
        }

        // TODO merge this with find processed observations method
        const obsEntities = await this.observationRepo.findBy({
            stationId: queryDto.stationIds.length === 1 ? queryDto.stationIds[0] : In(queryDto.stationIds),
            elementId: queryDto.elementId,
            level: queryDto.level,
            interval: queryDto.interval,
            datetime: Between(new Date(queryDto.fromDate), new Date(queryDto.toDate)),
            deleted: false,
        });

        const obsView: ViewObservationDto[] = [];
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
                qcStatus: obsEntity.qcStatus,
                qcTestLog: null,
                log: null,
                entryDatetime: obsEntity.entryDateTime.toISOString()
            };
            obsView.push(viewObs);
        }

        return obsView;
    }

}
