import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';
import { ObservationEntity, ObservationLogVo } from '../entities/observation.entity';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { SelectObservationDTO } from '../dtos/select-observation.dto';
import { DateUtils } from 'src/shared/utils/date.utils';
import { ObjectUtils } from 'src/shared/utils/object.util';

@Injectable()
export class ObservationsService {

    constructor(@InjectRepository(ObservationEntity) private readonly observationRepo: Repository<ObservationEntity>,
    ) { }

    async find(selectObsevationDto: SelectObservationDTO) {
        const selectOptions: FindOptionsWhere<ObservationEntity> = {};

        if (selectObsevationDto.stationId) {
            selectOptions.stationId = selectObsevationDto.stationId;
        }

        if (selectObsevationDto.elementId) {
            selectOptions.elementId = selectObsevationDto.elementId;
        }

        if (selectObsevationDto.sourceId) {
            selectOptions.sourceId = selectObsevationDto.sourceId;
        }

        this.setDateFilter(selectObsevationDto, selectOptions);

        return this.observationRepo.findBy(selectOptions);
    }

    private setDateFilter(selectObsevationDto: SelectObservationDTO, selectOptions: FindOptionsWhere<ObservationEntity>) {

        if (selectObsevationDto.year && selectObsevationDto.month && selectObsevationDto.day && selectObsevationDto.hour !== undefined) {
            selectOptions.datetime = DateUtils.getDateInSQLFormat(selectObsevationDto.year, selectObsevationDto.month, selectObsevationDto.day, selectObsevationDto.hour, 0, 0);
            return;
        }

        if (selectObsevationDto.year && selectObsevationDto.month && selectObsevationDto.day) {
            //a day has 24 hours
            selectOptions.datetime = Between(
                DateUtils.getDateInSQLFormat(selectObsevationDto.year, selectObsevationDto.month, selectObsevationDto.day, 0, 0, 0),
                DateUtils.getDateInSQLFormat(selectObsevationDto.year, selectObsevationDto.month, selectObsevationDto.day, 23, 0, 0));
            return;
        }

        if (selectObsevationDto.year && selectObsevationDto.month && selectObsevationDto.hour !== undefined) {
            const lastDay: number = DateUtils.getLastDayOfMonth(selectObsevationDto.year, selectObsevationDto.month - 1);
            const allDays: string[] = [];
            for (let day = 1; day <= lastDay; day++) {
                allDays.push(DateUtils.getDateInSQLFormat(selectObsevationDto.year, selectObsevationDto.month, day, selectObsevationDto.hour, 0, 0));
            }
            selectOptions.datetime = In(allDays);
            return;
        }

        if (selectObsevationDto.year && selectObsevationDto.month) {
            selectOptions.datetime = Between(
                DateUtils.getDateInSQLFormat(selectObsevationDto.year, selectObsevationDto.month, 1, 0, 0, 0),
                DateUtils.getDateInSQLFormat(selectObsevationDto.year, DateUtils.getLastDayOfMonth(selectObsevationDto.year, selectObsevationDto.month - 1), 1, 23, 0, 0));
            return;
        }

        if (selectObsevationDto.year) {
            selectOptions.datetime = Between(
                DateUtils.getDateInSQLFormat(selectObsevationDto.year, 1, 1, 0, 0, 0),
                DateUtils.getDateInSQLFormat(selectObsevationDto.year, 12, 1, 23, 0, 0));
            return;
        }

        //todo construct other date filters
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
            comment: entity.comment,
            entryUserId: entity.entryUserId,
            entryDateTime: entity.entryDateTime,
         
        };
    }

    private getObservationLogFromDto(dto: CreateObservationDto): ObservationLogVo {
        return {
            period: dto.period,
            value: dto.value,
            flag: dto.flag,
            qcStatus: dto.qcStatus,
            comment: dto.comment,
            entryUserId: '2', //todo. this will come from user session or token
            entryDateTime: DateUtils.getTodayDateInSQLFormat(),           
        };
    }

    private updateObservationEntity(entity: ObservationEntity, dto: CreateObservationDto): void {
        entity.period = dto.period;
        entity.value = dto.value;
        entity.flag = dto.flag;
        entity.qcStatus = dto.qcStatus;
        entity.comment = dto.comment;
        entity.entryUserId = '2';
        entity.entryDateTime = DateUtils.getTodayDateInSQLFormat();
        entity.log = this.getNewLog(entity.log, this.getObservationLogFromEntity(entity));
    }

    private getNewLog(currentLogs: string | null | undefined, newLog: ObservationLogVo): string {
        const logs: ObservationLogVo[] = currentLogs ? JSON.parse(currentLogs) : [];
        logs.push(newLog);
        return JSON.stringify(logs);
    }


}
