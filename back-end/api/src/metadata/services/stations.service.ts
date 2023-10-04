import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StationEntity } from '../entities/station.entity';
import { CreateStationDto } from '../dtos/station.dto';
import { CreateStationFormDto } from '../dtos/create-station-form.dto';
import { StationFormEntity, StationFormLogVo } from '../entities/station-form.entity';
import { SourcesService } from './sources.service';
import { ViewStationFormDto } from '../dtos/view-station-form.dto';
import { SourceEntity } from '../entities/source.entity';
import { ObjectUtils } from 'src/shared/utils/object.util';
import { DateUtils } from 'src/shared/utils/date.utils';

@Injectable()
export class StationsService {

    constructor(
        @InjectRepository(StationEntity) private readonly stationRepo: Repository<StationEntity>,
        @InjectRepository(StationFormEntity) private readonly stationFormsRepo: Repository<StationFormEntity>,
        private readonly sourcesService: SourcesService,
    ) { }

    async findAll() {
        return this.stationRepo.find();
    }

    async findOne(id: string) {
        const station = await this.stationRepo.findOneBy({
            id: id,
        });

        if (!station) {
            throw new NotFoundException(`Station #${id} not found`);
        }
        return station;
    }


    async saveCharacteristics(stationDto: CreateStationDto) {
        const station = this.stationRepo.create({
            ...stationDto,
        });
        return this.stationRepo.save(station);
    }


    async findForms(stationId: string): Promise<ViewStationFormDto[]> {
        const stationForms: StationFormEntity[] = await this.stationFormsRepo.findBy({ stationId: stationId });
        const stationFormDetails: SourceEntity[] = await this.sourcesService.findForms();

        return stationForms.flatMap(form => {
            const formDetails = stationFormDetails.find(fd => fd.id === form.sourceId);
            return formDetails ? {
                stationId: form.stationId,
                sourceId: form.sourceId,
                sourceName: formDetails.name,
                sourceDescription: formDetails.description,
                comment: form.comment,
                entryUser: form.entryUser + '',
                entryDateTime: form.entryDateTime,
                log: form.log
            } : []; // No matching formDetails, return an empty array
        });
    }

    async saveForms(stationFormDtos: CreateStationFormDto[]) {
        const stationFormEntities: StationFormEntity[] = [];

        for (const stationFormDto of stationFormDtos) {
            let stationFormEntity = await this.stationFormsRepo.findOneBy({ stationId: stationFormDto.stationId, sourceId: stationFormDto.sourceId });

            if (stationFormEntity) {

            } else {
                stationFormEntity = this.stationFormsRepo.create({
                    stationId: stationFormDto.stationId,
                    sourceId: stationFormDto.sourceId,
                    comment: stationFormDto.comment,
                });
            }


        }

        return stationFormEntities;
    }





    async save(createStationFormDtos: CreateStationFormDto[]) {
        const stationFormEntities: StationFormEntity[] = [];

        for (const createStationFormDto of createStationFormDtos) {
            let observationEntity = await this.stationFormsRepo.findOneBy({
                stationId: createStationFormDto.stationId,
                sourceId: createStationFormDto.sourceId,
            });

            if (observationEntity) {
                const oldChanges: StationFormLogVo = this.getObservationLogFromEntity(observationEntity);
                const newChanges: StationFormLogVo = this.getObservationLogFromDto(createStationFormDto);

                if (ObjectUtils.areObjectsEqual<StationFormLogVo>(oldChanges, newChanges, ['entryDateTime'])) {
                    continue;
                }
            } else {
                observationEntity = this.stationFormsRepo.create({
                    stationId: createStationFormDto.stationId, 
                    sourceId: createStationFormDto.sourceId, 
                });
            }

            this.updateObservationEntity(observationEntity, createStationFormDto);
            stationFormEntities.push(observationEntity);
        }

        return this.stationFormsRepo.save(stationFormEntities);
    }


    private getObservationLogFromEntity(entity: StationFormEntity): StationFormLogVo {
        return { 
            comment: entity.comment,
            entryUser: entity.entryUser,
            entryDateTime: entity.entryDateTime,           
        };
    }

    private getObservationLogFromDto(dto: CreateStationFormDto): StationFormLogVo {
        return { 
            comment: dto.comment,
            entryUser: 2, //todo. this will come from user session or token
            entryDateTime: DateUtils.getTodayDateInSQLFormat(),           
        };
    }

    private updateObservationEntity(entity: StationFormEntity, dto: CreateStationFormDto): void {
        entity.comment = dto.comment;
        entity.entryUser = 2;
        entity.entryDateTime = DateUtils.getTodayDateInSQLFormat();
        entity.log = this.getNewLog(entity.log, this.getObservationLogFromEntity(entity));
    }

    private getNewLog(currentLogs: string | null | undefined, newLog: StationFormLogVo): string {
        const logs: StationFormLogVo[] = currentLogs ? JSON.parse(currentLogs) : [];
        logs.push(newLog);
        return JSON.stringify(logs);
    }

    // async remove(id: string) {
    //     const station = await this.findOne(id);
    //     return this.stationRepo.remove(station);
    // }


}
