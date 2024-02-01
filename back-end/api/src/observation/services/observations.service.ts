import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';
import { ObservationEntity, ObservationLogVo } from '../entities/observation.entity';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { SelectObservationDTO } from '../dtos/select-observation.dto';
import { DateUtils } from 'src/shared/utils/date.utils';
import { ObjectUtils } from 'src/shared/utils/object.util';
import { StringUtils } from 'src/shared/utils/string.utils';
import { ElementsService } from 'src/metadata/services/elements.service';
import { SourcesService } from 'src/metadata/services/sources.service';
import { ViewObservationDto } from '../dtos/view-observation.dto';
import { StationsService } from 'src/metadata/services/stations.service';

@Injectable()
export class ObservationsService {

    constructor(@InjectRepository(ObservationEntity) private readonly observationRepo: Repository<ObservationEntity>,
        private readonly stationsService: StationsService,
        private readonly elementsService: ElementsService, private readonly sourcesService: SourcesService,
    ) { }


    async findProcessed(selectObsevationDto: SelectObservationDTO): Promise<ViewObservationDto[]> {
        return new Promise<ViewObservationDto[]>(async (resolve, reject) => {
            try {
                const obsView: ViewObservationDto[] = [];

                const obsEntities = await this.findRaw(selectObsevationDto);

                const stationEntities = await this.stationsService.findStations();
                const elementEntities = await this.elementsService.findElements();
                const sourceEntities = await this.sourcesService.findSources();

                for (const obsEntity of obsEntities) {
                    const viewObs: ViewObservationDto = new ViewObservationDto();

                    const station = stationEntities.find(data => data.id === obsEntity.stationId);
                    if (station) {
                        viewObs.stationName = station.name;
                    }

                    const element = elementEntities.find(data => data.id === obsEntity.elementId);
                    if (element) {
                        viewObs.elementAbbrv = element.abbreviation;
                    }

                    const source = sourceEntities.find(data => data.id === obsEntity.sourceId);
                    if (source) {
                        viewObs.sourceName = source.name;
                    }

                    viewObs.level = obsEntity.level;
                    viewObs.period = obsEntity.period;
                    viewObs.datetime = obsEntity.datetime;
                    viewObs.value = obsEntity.value;
                    viewObs.flag = obsEntity.flag;
                    viewObs.qcStatus = obsEntity.qcStatus;
                    viewObs.entryUserName = obsEntity.entryUserId; // TODO later fetch the user name
                    viewObs.entryDateTime = obsEntity.entryDateTime;

                    obsView.push(viewObs);
                }

                //console.log(obsView)

                resolve(obsView);
            } catch (error) {
                reject(error);
            }
        });
    }


    /*  page should be minimum of 1. */
    async findRaw(selectObsevationDto: SelectObservationDTO) {
        const selectOptions: FindOptionsWhere<ObservationEntity> = {};

        if (selectObsevationDto.stationId) {
            selectOptions.stationId = selectObsevationDto.stationId;
        }

        if (selectObsevationDto.elementIds) {
            selectOptions.elementId = In(selectObsevationDto.elementIds);
        }

        if (selectObsevationDto.sourceId) {
            selectOptions.sourceId = selectObsevationDto.sourceId;
        }

        if (selectObsevationDto.period) {
            selectOptions.period = selectObsevationDto.period;
        }

        this.setDateFilter(selectObsevationDto, selectOptions);

        selectOptions.deleted = false;

        if (selectObsevationDto.page && selectObsevationDto.pageSize) {
            const skip = (selectObsevationDto.page - 1) * selectObsevationDto.pageSize;
            return this.observationRepo.find({
                where: selectOptions,
                skip: skip,
                take: selectObsevationDto.pageSize
            });
        } else {
            return this.observationRepo.findBy(selectOptions);
        }


    }

    private setDateFilter(selectObsevationDto: SelectObservationDTO, selectOptions: FindOptionsWhere<ObservationEntity>) {
        if (selectObsevationDto.fromDate && selectObsevationDto.toDate && selectObsevationDto.hours) {

            if (selectObsevationDto.fromDate === selectObsevationDto.toDate && selectObsevationDto.hours.length === 1) {
                const hour: string = StringUtils.addLeadingZero(selectObsevationDto.hours[0])
                selectOptions.datetime = `${selectObsevationDto.fromDate} ${hour}:00:00`;
                return;
            }

            //TODO. Later refactor this block to be optimal for long date range selection. 
            //Long date range selection for may lead to many date-time strings generated.
            //Did this to remove dependency on underlying database, for instance hour extraction in mariadb differs from postgress.           
            //Proposed alternative could be to use TypeORM query builder
            //TODO. Test and compare the query bulder solution and this solution

            //get all possible dates for the period specied
            const allDateTimeStrings: string[] = [];
            const startDate = new Date(selectObsevationDto.fromDate);
            const endDate = new Date(selectObsevationDto.toDate);

            while (startDate <= endDate) {
                for (const hour of selectObsevationDto.hours) {
                    const dateTime = new Date(startDate);
                    dateTime.setHours(hour, 0, 0, 0);
                    allDateTimeStrings.push(dateTime.toISOString().slice(0, 19).replace('T', ' '));
                }

                startDate.setDate(startDate.getDate() + 1);
            }

            selectOptions.datetime = In(allDateTimeStrings);
            return;

        } else if (selectObsevationDto.fromDate && selectObsevationDto.toDate) {

            if (selectObsevationDto.fromDate === selectObsevationDto.toDate) {
                selectOptions.datetime = selectObsevationDto.fromDate;
                return;
            }


            selectOptions.datetime = Between(selectObsevationDto.fromDate, selectObsevationDto.toDate);
            return;
        }



        if (selectObsevationDto.year && selectObsevationDto.month && selectObsevationDto.day && selectObsevationDto.hours !== undefined) {
            const allHours: string[] = [];
            for (let index = 0; index < selectObsevationDto.hours.length; index++) {
                allHours.push(DateUtils.getDateInSQLFormat(selectObsevationDto.year, selectObsevationDto.month, selectObsevationDto.day, selectObsevationDto.hours[index], 0, 0));
            }
            selectOptions.datetime = In(allHours);
            return;
        }

        if (selectObsevationDto.year && selectObsevationDto.month && selectObsevationDto.day) {
            //a day has 24 hours
            selectOptions.datetime = Between(
                DateUtils.getDateInSQLFormat(selectObsevationDto.year, selectObsevationDto.month, selectObsevationDto.day, 0, 0, 0),
                DateUtils.getDateInSQLFormat(selectObsevationDto.year, selectObsevationDto.month, selectObsevationDto.day, 23, 0, 0));
            return;
        }

        if (selectObsevationDto.year && selectObsevationDto.month && selectObsevationDto.hours !== undefined) {
            const lastDay: number = DateUtils.getLastDayOfMonth(selectObsevationDto.year, selectObsevationDto.month);
            const allDays: string[] = [];
            for (let day = 1; day <= lastDay; day++) {
                for (let index = 0; index < selectObsevationDto.hours.length; index++) {
                    allDays.push(DateUtils.getDateInSQLFormat(selectObsevationDto.year, selectObsevationDto.month, day, selectObsevationDto.hours[index], 0, 0));
                }
            }
            selectOptions.datetime = In(allDays);
            return;
        }

        if (selectObsevationDto.year && selectObsevationDto.month) {
            selectOptions.datetime = Between(
                DateUtils.getDateInSQLFormat(selectObsevationDto.year, selectObsevationDto.month, 1, 0, 0, 0),
                DateUtils.getDateInSQLFormat(selectObsevationDto.year, DateUtils.getLastDayOfMonth(selectObsevationDto.year, selectObsevationDto.month), 1, 23, 0, 0));
            return;
        }

        if (selectObsevationDto.year) {
            selectOptions.datetime = Between(
                DateUtils.getDateInSQLFormat(selectObsevationDto.year, 1, 1, 0, 0, 0),
                DateUtils.getDateInSQLFormat(selectObsevationDto.year, 12, 1, 23, 0, 0));
            return;
        }


    }


    async save(createObservationDtoArray: CreateObservationDto[]) {
        const obsEntities: ObservationEntity[] = [];

        for (const createObservationDto of createObservationDtoArray) {
            let observationEntity = await this.observationRepo.findOneBy({
                stationId: createObservationDto.stationId,
                elementId: createObservationDto.elementId,
                sourceId: createObservationDto.sourceId,
                level: createObservationDto.level,
                datetime: createObservationDto.datetime,
                period: createObservationDto.period,
            });

            if (observationEntity) {
                const oldChanges: ObservationLogVo = this.getObservationLogFromEntity(observationEntity);
                const newChanges: ObservationLogVo = this.getObservationLogFromDto(createObservationDto);

                if (ObjectUtils.areObjectsEqual<ObservationLogVo>(oldChanges, newChanges, ['entryDateTime'])) {
                    continue;
                }

            } else {
                observationEntity = this.observationRepo.create({
                    stationId: createObservationDto.stationId,
                    elementId: createObservationDto.elementId,
                    sourceId: createObservationDto.sourceId,
                    level: createObservationDto.level,
                    datetime: createObservationDto.datetime,
                    period: createObservationDto.period,
                });

            }


            this.updateObservationEntity(observationEntity, createObservationDto);
            obsEntities.push(observationEntity);
        }

        return this.observationRepo.save(obsEntities);
    }


    private getObservationLogFromEntity(entity: ObservationEntity): ObservationLogVo {
        return {
            period: entity.period,
            value: entity.value,
            flag: entity.flag,
            qcStatus: entity.qcStatus,
            final: entity.final,
            comment: entity.comment,
            entryUserId: entity.entryUserId,
            deleted: entity.deleted,
            entryDateTime: entity.entryDateTime
        };
    }

    private getObservationLogFromDto(dto: CreateObservationDto): ObservationLogVo {
        return {
            period: dto.period,
            value: dto.value,
            flag: dto.flag,
            qcStatus: dto.qcStatus,
            final: false,
            comment: dto.comment,
            entryUserId: '2', //todo. this will come from user session or token
            deleted: false,
            entryDateTime: DateUtils.getTodayDateInSQLFormat()
        };
    }

    private updateObservationEntity(entity: ObservationEntity, dto: CreateObservationDto): void {
        entity.period = dto.period;
        entity.value = dto.value;
        entity.flag = dto.flag;
        entity.qcStatus = dto.qcStatus;
        entity.comment = dto.comment;
        entity.final = false;
        entity.entryUserId = '2';
        entity.deleted = (entity.value === null && entity.flag === null)
        entity.entryDateTime = DateUtils.getTodayDateInSQLFormat();
        entity.log = this.getNewLog(entity.log, this.getObservationLogFromEntity(entity));
    }

    private getNewLog(currentLogs: string | null | undefined, newLog: ObservationLogVo): string {
        const logs: ObservationLogVo[] = currentLogs ? JSON.parse(currentLogs) : [];
        logs.push(newLog);
        return JSON.stringify(logs);
    }


}
