import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ObservationEntity } from './observation.entity';
import { CreateObservationDto } from './dto/create-observation.dto';
import { SelectObservationDTO } from './dto/select-observation.dto';

@Injectable()
export class ObservationsService {

    constructor(@InjectRepository(ObservationEntity) private readonly observationRepo: Repository<ObservationEntity>,
    ) { }

    find(selectObsevationDto: SelectObservationDTO) {
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
            selectOptions.datetime = new Date(selectObsevationDto.year, selectObsevationDto.month - 1, selectObsevationDto.day, selectObsevationDto.hour, 0, 0, 0);
            return;
        }
        //todo construct other date filters
    }
    async findOne( keys: {stationId: string, elementId: number, sourceId: number, level: string, datetime: Date}) {
        const observation = await this.observationRepo.findOneBy({
           ...keys,
        });

        if (!observation) {
            throw new NotFoundException(`observation #${keys} not found`);
        }

        return observation;
    }

    async save(createObservationDtoArray: CreateObservationDto[]) {
       
        const obsEntitiesArray: ObservationEntity[] = [];

        for (const observationDto of createObservationDtoArray) {
            //get if it existing
            let observationEntity = await this.observationRepo.findOneBy({
                stationId: observationDto.stationId,
                elementId: observationDto.elementId,
                sourceId: observationDto.sourceId,
                level: observationDto.level,
                datetime: new Date(observationDto.datetime),
            });           

            //if not create new one
            if (!observationEntity) {
                observationEntity  = this.observationRepo.create({
                    stationId: observationDto.stationId,
                    elementId: observationDto.elementId,
                    sourceId: observationDto.sourceId,
                    level: observationDto.level,
                    datetime: new Date(observationDto.datetime),
                });
            }

            //update fields
            //todo. also make a log of what changed
            observationEntity.period = observationDto.period;
            observationEntity.value = observationDto.value;
            observationEntity.flag = observationDto.flag;
            observationEntity.qcStatus = observationDto.qcStatus;              
            observationEntity.entryUser = 1; 

            console.log('Adding', observationEntity);

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
