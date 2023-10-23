import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StationEntity, StationLogVo } from '../entities/station.entity';
import { CreateStationDto } from '../dtos/create-station.dto';
import { CreateStationFormDto } from '../dtos/create-station-form.dto';
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

@Injectable()
export class StationsService {

    constructor(
        @InjectRepository(StationEntity) private readonly stationRepo: Repository<StationEntity>,
        @InjectRepository(StationElementEntity) private readonly stationElementsRepo: Repository<StationElementEntity>,
        @InjectRepository(StationFormEntity) private readonly stationFormsRepo: Repository<StationFormEntity>,
        private readonly elementsService: ElementsService,
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

    async save(createStationDtos: CreateStationDto[]) {
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
        entity.log = this.getNewLog(entity.log, this.getStationLogFromEntity(entity));
    }

    private getNewLog(currentLogs: string | null | undefined, newLog: StationLogVo): string {
        const logs: StationLogVo[] = currentLogs ? JSON.parse(currentLogs) : [];
        logs.push(newLog);
        return JSON.stringify(logs);
    }


    async findElements(stationId: string): Promise<ViewStationElementDto[]> {
        const stationElements: StationElementEntity[] = await this.stationElementsRepo.findBy({ stationId: stationId });
        const stationElementDetails: ElementEntity[] = await this.elementsService.find();

        return stationElements.flatMap(form => {
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

    async deleteElements(stationId: string, elementIds: number[]): Promise<StationElementEntity[]> {
         //fetch existing station elements
         const existingElements = await this.stationElementsRepo.find({
            where: {
                stationId: stationId,
                elementId: In(elementIds),
            }
        });

        //then delete and return those deleted
        return this.stationElementsRepo.remove(existingElements);
    }
    

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

    async deleteForms(stationId: string, formIds: number[]): Promise<StationFormEntity[]> {
        //fetch existing station forms
        const existingForms = await this.stationFormsRepo.find({
           where: {
               stationId: stationId,
               sourceId: In(formIds),
           }
       });

       //then delete and return those deleted
       return this.stationFormsRepo.remove(existingForms);
   }



}
