import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StationEntity, StationLogVo } from '../entities/station.entity';
import { CreateStationDto } from '../dtos/create-station.dto';
import { StationFormEntity } from '../entities/station-form.entity';
import { SourcesService } from './sources.service';
import { ViewStationFormDto } from '../dtos/view-station-form.dto';
import { SourceEntity } from '../entities/source.entity';
import { ObjectUtils } from 'src/shared/utils/object.util';
import { DateUtils } from 'src/shared/utils/date.utils';
import { ViewStationElementDto } from '../dtos/view-station-element.dto';
import { StationElementEntity } from '../entities/station-element.entity';
import { ElementsService } from './elements.service';
import { ElementEntity } from '../entities/element.entity';
import { StationElementLimitEntity, StationElementLimitEntityLogVo } from '../entities/station-element-limit.entity';
import { CreateStationElementLimitDto } from '../dtos/create-station-element-limit.dto';
import { ViewStationElementLimitDto } from '../dtos/view-station-element-limit.dto';

@Injectable()
export class StationsService {

    constructor(
        @InjectRepository(StationEntity) private readonly stationRepo: Repository<StationEntity>,
        @InjectRepository(StationElementEntity) private readonly stationElementsRepo: Repository<StationElementEntity>,
        @InjectRepository(StationElementLimitEntity) private readonly stationElementLimitsRepo: Repository<StationElementLimitEntity>,
        @InjectRepository(StationFormEntity) private readonly stationFormsRepo: Repository<StationFormEntity>,
        private readonly elementsService: ElementsService,
        private readonly sourcesService: SourcesService,
    ) { }

    async findAll() {
        return this.stationRepo.find();
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

    async saveStations(createStationDtos: CreateStationDto[]) {
        const stationEntities: StationEntity[] = [];

        for (const createStationDto of createStationDtos) {
            let stationEntity = await this.stationRepo.findOneBy({
                id: createStationDto.id,
            });

            if (stationEntity) {
                const oldChanges: StationLogVo = this.getStationLogFromEntity(stationEntity);
                const newChanges: StationLogVo = this.getStationLogFromDto(createStationDto);

                if (ObjectUtils.areObjectsEqual<StationLogVo>(oldChanges, newChanges, ['entryDateTime'])) {
                    continue;
                }
            } else {
                stationEntity = this.stationRepo.create({
                    id: createStationDto.id,
                });
            }

            this.updateStationEntity(stationEntity, createStationDto);
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

    private getStationLogFromDto(dto: CreateStationDto): StationLogVo {
        return {
            name: dto.name,
            description: dto.description,
            comment: dto.comment,
            entryUserId: '2', //todo. this will come from user session or token
            entryDateTime: DateUtils.getTodayDateInSQLFormat(),
        };
    }

    private updateStationEntity(entity: StationEntity, dto: CreateStationDto): void {
        entity.comment = dto.comment;
        entity.entryUserId = '2';
        entity.entryDateTime = DateUtils.getTodayDateInSQLFormat();
        entity.log = this.getNewStationLog(entity.log, this.getStationLogFromEntity(entity));
    }

    private getNewStationLog(currentLogs: string | null | undefined, newLog: StationLogVo): string {
        const logs: StationLogVo[] = currentLogs ? JSON.parse(currentLogs) : [];
        logs.push(newLog);
        return JSON.stringify(logs);
    }

     //---------------------------------------

     //--------------Station Elements--------------------
    async findElements(stationId: string): Promise<ViewStationElementDto[]> {
        const stationElementEntities: StationElementEntity[] = await this.stationElementsRepo.findBy({ stationId: stationId });
        const stationElementDetails: ElementEntity[] = await this.elementsService.find();

        return stationElementEntities.flatMap(form => {
            const elementDetails: undefined | ElementEntity = stationElementDetails.find(fd => fd.id === form.elementId);
            return elementDetails ? {
                stationId: form.stationId,
                elementId: form.elementId,
                elementName: elementDetails.name,
                elementDescription: elementDetails.description,
                entryUserId: form.entryUserId, //todo. get user name
                entryDateTime: form.entryDateTime
            } : []; // No matching formDetails, return an empty array
        });
    }

    async saveElements(stationId: string, elementIds: number[]): Promise<StationElementEntity[]> {
        //fetch existing station elements
        const existingElements = await this.stationElementsRepo.find({
            where: {
                stationId: stationId,
                elementId: In(elementIds),
            }
        });

        // get existing element ids from the entities
        const existingElementIds = existingElements.map(element => element.elementId);

        //save new station elements
        const stationElementEntities: StationElementEntity[] = [];
        for (const id of elementIds) {
            if (!existingElementIds.includes(id)) {
                stationElementEntities.push(this.stationElementsRepo.create({
                    stationId: stationId,
                    elementId: id,
                    entryUserId: '2',
                    entryDateTime: DateUtils.getTodayDateInSQLFormat()
                }));
            }
        }

        return this.stationElementsRepo.save(stationElementEntities);
    }

    async deleteElement(stationId: string, elementId: number): Promise<StationElementEntity> {
        const fetched = await this.stationElementsRepo.findOneBy({                stationId: stationId,                elementId: elementId });
      
        if (!fetched) {
            throw new NotFoundException(`Station Element #${stationId} - #${elementId}  not found`);
        }
        return this.stationElementsRepo.remove(fetched);
    }

     //---------------------------------------

    //--------------Station Element Limits--------------------
    async findStationElementLimit(stationId: string, elementId: number, monthId: number) {
        const stationElementLimit = await this.stationElementLimitsRepo.findOneBy({
            stationId: stationId,
            elementId: elementId,
            monthId: monthId,
        });

        if (!stationElementLimit) {
            throw new NotFoundException(`Station Element #${stationId} - #${elementId} - #${monthId} not found`);
        }
        return stationElementLimit;
    }

    async findStationElementLimits(stationId: string, elementId: number): Promise<ViewStationElementLimitDto[]> {
        const stationElementLimits: StationElementLimitEntity[] = await this.stationElementLimitsRepo.findBy({ stationId: stationId, elementId: elementId });
        return stationElementLimits.map(stationElementLimit => ( {...stationElementLimit}));     
    }

    async saveElementLimit(stationId: string, elementId: number, monthId: number, createStationLimitsDtos: CreateStationElementLimitDto): Promise<StationElementLimitEntity> {

        // Check if the entity exists
        let elementLimitEntity = await this.stationElementLimitsRepo.findOneBy({
            stationId: stationId,
            elementId: elementId,
            monthId: monthId,
        });

        if (elementLimitEntity) {
            const oldChanges:StationElementLimitEntityLogVo = this.getStationElementLogFromEntity(elementLimitEntity);
            const newChanges:StationElementLimitEntityLogVo = this.getStationElementLogFromDto(createStationLimitsDtos);

            if (ObjectUtils.areObjectsEqual(oldChanges, newChanges, ['entryDateTime'])) {
                return elementLimitEntity;
            }
        } else {
            // If it doesn't exist, create the entity
            elementLimitEntity = this.stationElementLimitsRepo.create({
                stationId: stationId,
                elementId: elementId,
                monthId: monthId,
                entryUserId: '2',
                entryDateTime: DateUtils.getTodayDateInSQLFormat()
            });
        }

        this.updateStationElementEntity(elementLimitEntity, createStationLimitsDtos);

        return this.stationElementLimitsRepo.save(elementLimitEntity);

    }

    private getStationElementLogFromEntity(entity: StationElementLimitEntity): StationElementLimitEntityLogVo {
        return {
            lowerLimit: entity.lowerLimit,
            upperLimit: entity.upperLimit,
            comment: entity.comment,
            entryUserId: entity.entryUserId,
            entryDateTime: entity.entryDateTime,
        };
    }

    private getStationElementLogFromDto(dto: CreateStationElementLimitDto): StationElementLimitEntityLogVo {
        return {
            lowerLimit: dto.lowerLimit,
            upperLimit: dto.upperLimit,
            comment: dto.comment,
            entryUserId: '2', //todo. this will come from user session or token
            entryDateTime: DateUtils.getTodayDateInSQLFormat(),
        };
    }

    private updateStationElementEntity(entity: StationElementLimitEntity, dto: CreateStationElementLimitDto): void {
        entity.lowerLimit = dto.lowerLimit;
        entity.upperLimit = dto.upperLimit;
        entity.comment = dto.comment;
        entity.entryUserId = '2';
        entity.entryDateTime = DateUtils.getTodayDateInSQLFormat();
        entity.log = ObjectUtils.getJsonArray(entity.log, this.getStationElementLogFromEntity(entity));
    }

    async deleteElementLimit(stationId: string, elementId: number, monthId: number): Promise<StationElementLimitEntity> {
        const existingStationElementLimit = await this.findStationElementLimit( stationId, elementId,monthId );
        return this.stationElementLimitsRepo.remove(existingStationElementLimit);
    }

    //---------------------------------------

    //---------forms------------------------------
    async findForms(stationId: string): Promise<ViewStationFormDto[]> {
        const stationForms: StationFormEntity[] = await this.stationFormsRepo.findBy({ stationId: stationId });
        const stationFormDetails: SourceEntity[] = await this.sourcesService.findForms();

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

    async saveForms(stationId: string, formIds: number[]): Promise<StationFormEntity[]> {
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
                stationFormEntities.push(this.stationFormsRepo.create({
                    stationId: stationId,
                    sourceId: id,
                    entryUserId: '2',
                    entryDateTime: DateUtils.getTodayDateInSQLFormat()
                }));
            }
        }

        return this.stationFormsRepo.save(stationFormEntities);
    }

    async deleteForm(stationId: string, formId: number): Promise<StationFormEntity> {
        const fetched = await this.stationFormsRepo.findOneBy({stationId: stationId,sourceId: formId });

        if (!fetched) {
            throw new NotFoundException(`Station Form #${stationId} - #${formId}  not found`);
        }

        return this.stationFormsRepo.remove(fetched);
    }
    //---------------------------------------
}
