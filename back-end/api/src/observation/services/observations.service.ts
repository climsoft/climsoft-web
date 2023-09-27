import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';
import { ObservationEntity } from '../entities/observation.entity';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { SelectObservationDTO } from '../dtos/select-observation.dto';
import { DateUtils } from 'src/shared/utils/date.utils';
import { ObservationLogDto } from '../dtos/observation-log.dto';

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

        // return this.observationRepo.find({
        //     where: {
        //         stationId : selectObsevationDto.stationId,
        //         elementId : selectObsevationDto.elementId,
        //         sourceId : selectObsevationDto.sourceId,
        //         datetime: Between('2023-09-02 06:00:00','2023-09-03 06:00:00'),
        //     },
        //   });
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

        //console.log('date option',  selectOptions.datetime )
        //todo construct other date filters
    }

    // async findOne( keys: {stationId: string, elementId: number, sourceId: number, level: string, datetime: string}) {
    //     const observation = await this.observationRepo.findOneBy({
    //        ...keys,
    //     });

    //     if (!observation) {
    //         throw new NotFoundException(`observation #${keys} not found`);
    //     }

    //     return observation;
    // }

    async save(createObservationDtoArray: CreateObservationDto[]) {

        const obsEntities: ObservationEntity[] = [];

        for (const createObservationDto of createObservationDtoArray) {
            //get if it existing
            let observationEntity = await this.observationRepo.findOneBy({
                stationId: createObservationDto.stationId,
                elementId: createObservationDto.elementId,
                sourceId: createObservationDto.sourceId,
                level: createObservationDto.level,
                datetime: createObservationDto.datetime,
            });

           
            if (observationEntity) {
                 //if exists compare changes excluding entryDatetime. Important to bexclude entryDatetime
                const oldChanges: ObservationLogDto = {
                    period: observationEntity.period,
                    value: observationEntity.value,
                    flag: observationEntity.flag,
                    qcStatus: observationEntity.qcStatus,
                    entryUser: observationEntity.entryUser,
                    comment: observationEntity.comment
                };
                const newChanges: ObservationLogDto = {
                    period: createObservationDto.period,
                    value: createObservationDto.value,
                    flag: createObservationDto.flag,
                    qcStatus: createObservationDto.qcStatus,
                    entryUser: 2,
                    comment: createObservationDto.comment
                };

                 //if not create new one
                //if no changes then no need to add in the list of saving
                if ( this.areObservationChangesEqual(oldChanges, newChanges)) {
                    continue;
                }

            } else {

                observationEntity = this.observationRepo.create({
                    stationId: createObservationDto.stationId,
                    elementId: createObservationDto.elementId,
                    sourceId: createObservationDto.sourceId,
                    level: createObservationDto.level,
                    datetime: createObservationDto.datetime
                });

            }

            //update entry fields
            observationEntity.period = createObservationDto.period;
            observationEntity.value = createObservationDto.value;
            observationEntity.flag = createObservationDto.flag;
            observationEntity.qcStatus = createObservationDto.qcStatus;
            observationEntity.comment = createObservationDto.comment;
            observationEntity.entryUser = 2; 
            observationEntity.entryDateTime = DateUtils.getTodayDateInSQLFormat();

            //create a new log from the updated fields
            observationEntity.log  = this.getNewLog(observationEntity.log, {
                period: observationEntity.period,
                value: observationEntity.value,
                flag: observationEntity.flag,
                qcStatus: observationEntity.qcStatus,
                entryUser: observationEntity.entryUser,
                entryDateTime: observationEntity.entryDateTime,
                comment: observationEntity.comment
            });

            
            //console.log('saving', observationEntity)
            obsEntities.push(observationEntity)

        }

        //save all observations
        return this.observationRepo.save(obsEntities);
    }


    private getNewLog(currentLogs: string | null | undefined, newLog: ObservationLogDto): string {
        const logs: ObservationLogDto[] = currentLogs ? JSON.parse(currentLogs) : [];
        logs.push(newLog);
        return JSON.stringify(logs);
    }

    private areObservationChangesEqual(log1: ObservationLogDto, log2: ObservationLogDto): boolean {
        //console.log('log1 object', log1, 'log2 object', log2)
        for (const key in log1) {
            if (log1.hasOwnProperty(key)) {
                if (log1[key as keyof ObservationLogDto] !== log2[key as keyof ObservationLogDto]) {
                    return false;
                }
            }
        }
        return true;
    }


    // async update(id: string, obsDto: CreateObservationDto) {
    //     const station = await this.observationRepo.preload({
    //         ...obsDto,
    //     });
    //     if (!station) {
    //         throw new NotFoundException(`Observation #${id} not found`);
    //     }
    //     return this.observationRepo.save(station);
    // }

    // async remove(id: string) {
    //     //const obs = await this.findOne(id);
    //     //return this.observationRepo.remove(obs);
    //     return "";
    // }
}
