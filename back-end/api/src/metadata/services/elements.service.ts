import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ElementEntity, ElementLogVo } from '../entities/element.entity';
import { CreateElementDto } from '../dtos/create-element.dto';
import { ObjectUtils } from 'src/shared/utils/object.util';
import { DateUtils } from 'src/shared/utils/date.utils';

@Injectable()
export class ElementsService {
    constructor(@InjectRepository(ElementEntity) private readonly elementRepo: Repository<ElementEntity>,
    ) { }

    findElements(ids?: number[]) {

        if (ids) {
            return this.elementRepo.findBy({
                id: In(ids),
            });
        }

        return this.elementRepo.find();
    }


    async findElement(id: number) {
        const element = await this.elementRepo.findOneBy({
            id: id,
        });

        if (!element) {
            throw new NotFoundException(`Element #${id} not found`);
        }
        return element;
    }

    async saveElements(createElementDtos: CreateElementDto[]) {
        const elementEntities: ElementEntity[] = [];

        for (const createElementDto of createElementDtos) {
            let stationEntity = await this.elementRepo.findOneBy({
                id: createElementDto.id,
            });

            if (stationEntity) {
                const oldChanges: ElementLogVo = this.getElementLogFromEntity(stationEntity);
                const newChanges: ElementLogVo = this.getElementLogFromDto(createElementDto);

                //if no changes, then no need to save
                if (ObjectUtils.areObjectsEqual<ElementLogVo>(oldChanges, newChanges, ['entryDateTime'])) {
                    continue;
                }
            } else {
                stationEntity = this.elementRepo.create({
                    id: createElementDto.id,
                });
            }

            this.updateElementEntity(stationEntity, createElementDto);
            elementEntities.push(stationEntity);
        }

        return this.elementRepo.save(elementEntities);
    }

    private getElementLogFromEntity(entity: ElementEntity): ElementLogVo {
        return {
            name: entity.name,
            abbreviation: entity.abbreviation,
            description: entity.description,
            typeId: entity.typeId,
            lowerLimit: entity.lowerLimit,
            upperLimit: entity.upperLimit,
            entryScaleFactor: entity.entryScaleFactor,
            comment: entity.comment,
            entryUserId: entity.entryUserId,
            entryDateTime: entity.entryDateTime,
        };
    }

    private getElementLogFromDto(dto: CreateElementDto): ElementLogVo {
        return {
            name: dto.name,
            abbreviation: dto.abbreviation,
            description: dto.description,
            typeId: dto.typeId,
            lowerLimit: dto.lowerLimit,
            upperLimit: dto.upperLimit,
            entryScaleFactor: dto.entryScaleFactor,
            comment: dto.comment,
            entryUserId: '2', //todo. this will come from user session or token
            entryDateTime: DateUtils.getTodayDateInSQLFormat(),
        };
    }

    private updateElementEntity(entity: ElementEntity, dto: CreateElementDto): void {
        entity.name = dto.name;
        entity.abbreviation = dto.abbreviation;
        entity.description = dto.description;
        entity.typeId = dto.typeId;
        entity.lowerLimit = dto.lowerLimit;
        entity.upperLimit = dto.upperLimit;
        entity.entryScaleFactor = dto.entryScaleFactor;
        entity.comment = dto.comment;
        entity.entryUserId = '2';
        entity.entryDateTime = DateUtils.getTodayDateInSQLFormat();
        entity.log = ObjectUtils.getNewLog<ElementLogVo>(entity.log, this.getElementLogFromEntity(entity));
    }


}
