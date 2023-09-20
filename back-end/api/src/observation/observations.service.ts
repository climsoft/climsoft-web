import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';
import { ObservationEntity } from './observation.entity';
import { CreateObservationDto } from './dto/create-observation.dto';
import { SelectObservationDTO } from './dto/select-observation.dto';
import { DateUtils } from 'src/shared/date.utils';

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

        const obsEntitiesArray: ObservationEntity[] = [];

        for (const observationDto of createObservationDtoArray) {
            //get if it existing
            let observationEntity = await this.observationRepo.findOneBy({
                stationId: observationDto.stationId,
                elementId: observationDto.elementId,
                sourceId: observationDto.sourceId,
                level: observationDto.level,
                datetime: observationDto.datetime,
            });

            //if not create new one
            if (!observationEntity) {
                observationEntity = this.observationRepo.create({
                    stationId: observationDto.stationId,
                    elementId: observationDto.elementId,
                    sourceId: observationDto.sourceId,
                    level: observationDto.level,
                    datetime: observationDto.datetime,
                });
            }

            //update fields
            //todo. also make a log of what changed
            observationEntity.period = observationDto.period;
            observationEntity.value = observationDto.value;
            observationEntity.flag = observationDto.flag;
            observationEntity.qcStatus = observationDto.qcStatus;
            observationEntity.entryUser = 1;

            //console.log('Adding', observationEntity);

            //add it to array for saving
            obsEntitiesArray.push(observationEntity)
        }

        //save all observations
        return this.observationRepo.save(obsEntitiesArray);
    }

    async update(id: string, obsDto: CreateObservationDto) {
        const station = await this.observationRepo.preload({

            ...obsDto,
        });
        if (!station) {
            throw new NotFoundException(`Coffee #${id} not found`);
        }
        return this.observationRepo.save(station);
    }

    async remove(id: string) {
        //const obs = await this.findOne(id);
        //return this.observationRepo.remove(obs);
        return "";
    }
}
