import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Repository } from 'typeorm';
import { StationEntity, StationLogVo } from '../entities/station.entity';
import { CreateStationDto } from '../dtos/create-station.dto';
import { StationFormEntity } from '../entities/station-form.entity';
import { SourcesService } from './sources.service';
import { ViewStationFormDto } from '../dtos/view-station-form.dto';
import { SourceEntity, SourceTypeEnum } from '../entities/source.entity';
import { ObjectUtils } from 'src/shared/utils/object.util';
import { DateUtils } from 'src/shared/utils/date.utils'; 

@Injectable()
export class StationsService {

    constructor(
        @InjectRepository(StationEntity) private readonly stationRepo: Repository<StationEntity>,
        @InjectRepository(StationFormEntity) private readonly stationFormsRepo: Repository<StationFormEntity>,
      
        private readonly sourcesService: SourcesService,
    ) { }

    async findStations(ids?: string[]) {
        const findOptions: FindManyOptions<StationEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (ids && ids.length > 0) {
            findOptions.where = { id: In(ids) };
        }

        return this.stationRepo.find(findOptions);
    }

    async findStation(id: string) {
        const station = await this.stationRepo.findOneBy({
            id: id,
        });

        if (!station) {
            throw new NotFoundException(`Station #${id} not found`);
        }
        return station;
    }

    async saveStations(createStationDtos: CreateStationDto[], userId: number) {
        const stationEntities: StationEntity[] = [];

        for (const createStationDto of createStationDtos) {
            let stationEntity = await this.stationRepo.findOneBy({
                id: createStationDto.id,
            });

            if (stationEntity) {
                const oldChanges: StationLogVo = this.getStationLogFromEntity(stationEntity);
                const newChanges: StationLogVo = this.getStationLogFromDto(createStationDto, userId);

                //if no changes, then no need to save
                if (ObjectUtils.areObjectsEqual<StationLogVo>(oldChanges, newChanges, ['entryDateTime'])) {
                    continue;
                }
            } else {
                stationEntity = this.stationRepo.create({
                    id: createStationDto.id,
                });
            }

            this.updateStationEntity(stationEntity, createStationDto, userId);
            stationEntities.push(stationEntity);
        }

        return this.stationRepo.save(stationEntities);
    }

    private getStationLogFromEntity(entity: StationEntity): StationLogVo {
        return {
            name: entity.name,
            description: entity.description,
            comment: entity.comment,
            entryUserId: entity.entryUserId,
            entryDateTime: entity.entryDateTime,
        };
    }

    private getStationLogFromDto(dto: CreateStationDto, userId: number): StationLogVo {
        return {
            name: dto.name,
            description: dto.description,
            comment: dto.comment,
            entryUserId: userId,
            entryDateTime: DateUtils.getTodayDateInSQLFormat(),
        };
    }

    private updateStationEntity(entity: StationEntity, dto: CreateStationDto, userId: number): void {
        entity.name = dto.name;
        entity.description = dto.description;
        entity.comment = dto.comment;
        entity.entryUserId = userId;
        entity.entryDateTime = DateUtils.getTodayDateInSQLFormat();
        entity.log = ObjectUtils.getNewLog<StationLogVo>(entity.log, this.getStationLogFromEntity(entity));
    }

    //---------------------------------------


    //---------forms------------------------------
    async findForms(stationId: string): Promise<ViewStationFormDto[]> {
        const stationForms: StationFormEntity[] = await this.stationFormsRepo.findBy({ stationId: stationId });
        const stationFormDetails: SourceEntity[] = await this.sourcesService.findSources(SourceTypeEnum.FORM);

        return stationForms.flatMap(form => {
            const formDetails: undefined | SourceEntity = stationFormDetails.find(fd => fd.id === form.sourceId);
            return formDetails ? {
                stationId: form.stationId,
                sourceId: form.sourceId,
                sourceName: formDetails.name,
                sourceDescription: formDetails.description,
                entryUserId: form.entryUserId, //todo. get user name
                entryDateTime: form.entryDateTime
            } : []; // No matching formDetails, return an empty array
        });
    }

    async saveForms(stationId: string, formIds: number[], userId: number): Promise<StationFormEntity[]> {
        //fetch existing station elements
        const existingForms: StationFormEntity[] = await this.stationFormsRepo.find({
            where: {
                stationId: stationId,
                sourceId: In(formIds),
            }
        });

        // get existing form ids from the entities
        const existingFormIds = existingForms.map(form => form.sourceId);

        //save new station forms
        const stationFormEntities: StationFormEntity[] = [];
        for (const id of formIds) {
            if (!existingFormIds.includes(id)) {
                const stationFormEntity: StationFormEntity = this.stationFormsRepo.create({
                    stationId: stationId,
                    sourceId: id,
                    entryUserId: userId,
                    entryDateTime: DateUtils.getTodayDateInSQLFormat()
                });

                stationFormEntities.push(stationFormEntity);
            }
        }

        return this.stationFormsRepo.save(stationFormEntities);
    }

    async deleteForm(stationId: string, formId: number): Promise<StationFormEntity> {
        const fetched = await this.stationFormsRepo.findOneBy({ stationId: stationId, sourceId: formId });

        if (!fetched) {
            throw new NotFoundException(`Station Form #${stationId} - #${formId}  not found`);
        }

        return this.stationFormsRepo.remove(fetched);
    }
    //---------------------------------------
}
