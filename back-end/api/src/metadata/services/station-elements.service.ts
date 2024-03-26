import { In, Repository } from "typeorm";
import { StationElementEntity, StationElementEntityLogVo, StationElementLimit } from "../entities/station-element.entity";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ObjectUtils } from "src/shared/utils/object.util";
import { DateUtils } from "src/shared/utils/date.utils";
import { ElementsService } from "./elements.service";
import { ViewElementDto } from "../dtos/view-element.dto";

@Injectable()
export class StationElementsService {

    public constructor(
        @InjectRepository(StationElementEntity) private stationElementsRepo: Repository<StationElementEntity>,
        private elementsService: ElementsService) {
    }

    public async findElements(stationId: string): Promise<ViewElementDto[]> {
        const stationElementEntities: StationElementEntity[] = await this.stationElementsRepo.findBy({ stationId: stationId });
        const elementIds: number[] = stationElementEntities.map(data => (data.elementId));
        return elementIds.length > 0 ? this.elementsService.findElements(elementIds) : [];
    }

    public async saveElements(stationId: string, newElementIds: number[], userId: number): Promise<number[]> {
        //fetch existing station elements
        const existingElements = await this.stationElementsRepo.find({
            where: {
                stationId: stationId,
                elementId: In(newElementIds),
            }
        });

        // get existing element ids from the entities
        const existingElementIds = existingElements.map(element => element.elementId);

        // Only save new station elements
        const stationElementEntities: StationElementEntity[] = [];
        for (const elementId of newElementIds) {
            if (!existingElementIds.includes(elementId)) {
                const stationElementEntity: StationElementEntity = this.stationElementsRepo.create({
                    stationId: stationId,
                    elementId: elementId,
                    entryUserId: userId,
                    entryDateTime: DateUtils.getTodayDateInSQLFormat()
                });
                stationElementEntities.push(stationElementEntity);
            }
        }

        const elementsSaved: StationElementEntity[] = await this.stationElementsRepo.save(stationElementEntities);
        return elementsSaved.map(data => data.elementId);
    }

    public async deleteElements(stationId: string, elementId: number[]): Promise<number[]> {
        //fetch existing station elements
        const existingElements = await this.stationElementsRepo.find({
            where: {
                stationId: stationId,
                elementId: In(elementId),
            }
        });

        const elementDeleted: StationElementEntity[] = await this.stationElementsRepo.remove(existingElements);

        return elementDeleted.map(data => data.elementId);
    }

    //----------limits--------------

    public async findStationElementLimits(stationId: string, elementId: number): Promise<StationElementLimit[]> {
        const stationElement = await this.stationElementsRepo.findOneBy({ stationId, elementId });
        return stationElement && stationElement.monthLimits ? stationElement.monthLimits : [];
    }

    public async saveElementLimit(stationId: string, elementId: number, limitsDtos: StationElementLimit[], userId: number): Promise<StationElementLimit[]> {

        //get the station element
        const stationElementEntity: StationElementEntity | null = await this.stationElementsRepo.findOneBy({
            stationId: stationId,
            elementId: elementId,
        });

        if (!stationElementEntity) {
            throw new NotFoundException(`Station #${stationId} element #${elementId} not found`);
        }

        const newLimits = this.getUpdatedStationElementLimits(stationElementEntity.monthLimits, limitsDtos)

        const oldChanges: StationElementEntityLogVo = this.getLogFromEntity(stationElementEntity);
        const newChanges: StationElementEntityLogVo = this.getLogFromLimitsDto(newLimits, userId);

        //if there are changes, then no need to save
        if (!ObjectUtils.areObjectsEqual(oldChanges, newChanges, ["entryUserId", "entryDateTime", "instrumentId"])) {
            this.updateEntityWithLimits(stationElementEntity, newLimits, userId);
            await this.stationElementsRepo.save(stationElementEntity);
        }

        return newLimits;

    }

    private getUpdatedStationElementLimits(oldLimitsDtos: StationElementLimit[] | null, newLimitsDtos: StationElementLimit[]): StationElementLimit[] {
        const newMergedlimits: StationElementLimit[] = [];
        for (let monthId = 1; monthId <= 12; monthId++) {
            let newLimit = newLimitsDtos.find(data => data.monthId === monthId);
            if (!newLimit && oldLimitsDtos) {
                newLimit = oldLimitsDtos.find(data => data.monthId === monthId);
            }

            if (newLimit) {
                newMergedlimits.push(newLimit);
            }

        }

        return newMergedlimits;
    }

    private getLogFromEntity(entity: StationElementEntity): StationElementEntityLogVo {
        return {
            instrumentId: entity.instrumentId,
            monthLimits: entity.monthLimits,
            entryUserId: entity.entryUserId,
            entryDateTime: entity.entryDateTime.toISOString()
        };
    }

    private getLogFromLimitsDto(limitsDto: StationElementLimit[], userId: number): StationElementEntityLogVo {
        return {
            instrumentId: null,
            monthLimits: limitsDto,
            entryUserId: userId,
            entryDateTime: new Date().toISOString()
        };
    }

    private updateEntityWithLimits(entity: StationElementEntity, limitsDto: StationElementLimit[], userId: number): void {
        // Check if some limits are not null. If all limits are nulls, then just set the monthLimits field to null.
        const someLimitsAdded: boolean = limitsDto.some(limit => limit.lowerLimit !== null || limit.upperLimit !== null);

        entity.monthLimits = someLimitsAdded ? limitsDto : null;
        entity.entryUserId = userId;
        entity.entryDateTime = new Date();
        entity.log = ObjectUtils.getNewLog<StationElementEntityLogVo>(entity.log, this.getLogForEntity(entity));
    }

    //-------------------

    //-----------instruments------------------

    //TODO. implement find etc for instruments

    private getLogForInstrumentFromDto(instrumentId: number, userId: number): StationElementEntityLogVo {
        return {
            instrumentId: instrumentId,
            monthLimits: null,
            entryUserId: userId,
            entryDateTime: new Date().toISOString()
        };
    }


    private updateEntityWithInstrument(entity: StationElementEntity, instrumentId: number, userId: number): void {
        entity.instrumentId = instrumentId;
        entity.entryUserId = userId;
        entity.entryDateTime = new Date();
        entity.log = ObjectUtils.getNewLog<StationElementEntityLogVo>(entity.log, this.getLogForEntity(entity));
    }

    //-------------------

    //-------------------
    private getLogForEntity(entity: StationElementEntity): StationElementEntityLogVo {
        return {
            instrumentId: entity.instrumentId,
            monthLimits: entity.monthLimits,
            entryUserId: entity.entryUserId,
            entryDateTime: entity.entryDateTime.toISOString()
        };
    }



}