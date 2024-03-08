import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Repository } from 'typeorm';
import { ElementEntity, ElementLogVo } from '../entities/element.entity';
import { CreateElementDto } from '../dtos/create-element.dto';
import { ObjectUtils } from 'src/shared/utils/object.util';
import { DateUtils } from 'src/shared/utils/date.utils';
import { ViewElementDto } from '../dtos/view-element.dto';

@Injectable()
export class ElementsService {
    constructor(@InjectRepository(ElementEntity) private readonly elementRepo: Repository<ElementEntity>,
    ) { }

    public async findElements(ids?: number[]): Promise<ViewElementDto[]> {
        const findOptions: FindManyOptions<ElementEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (ids) {
            findOptions.where = { id: In(ids) };
        }

        const elementEntities = await this.elementRepo.find(findOptions);
        return elementEntities.map(element => ({ ...element }));
    }

    public async findElement(id: number): Promise<ElementEntity> {
        const element: ElementEntity | null = await this.elementRepo.findOneBy({
            id: id,
        });

        if (!element) {
            throw new NotFoundException(`Element #${id} not found`);
        }
        return element;
    }

    public async saveElements(createElementDtos: CreateElementDto[], userId: number): Promise<ElementEntity[]> {
        const elementEntities: ElementEntity[] = [];

        for (const createElementDto of createElementDtos) {
            let stationEntity = await this.elementRepo.findOneBy({
                id: createElementDto.id,
            });

            if (stationEntity) {
                const oldChanges: ElementLogVo = this.getElementLogFromEntity(stationEntity);
                const newChanges: ElementLogVo = this.getElementLogFromDto(createElementDto, userId);

                //if no changes, then no need to save
                if (ObjectUtils.areObjectsEqual<ElementLogVo>(oldChanges, newChanges, ['entryDateTime'])) {
                    continue;
                }
            } else {
                stationEntity = this.elementRepo.create({
                    id: createElementDto.id,
                });
            }

            this.updateElementEntity(stationEntity, createElementDto, userId);
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

    private getElementLogFromDto(dto: CreateElementDto, userId: number): ElementLogVo {
        return {
            name: dto.name,
            abbreviation: dto.abbreviation,
            description: dto.description,
            typeId: dto.typeId,
            lowerLimit: dto.lowerLimit,
            upperLimit: dto.upperLimit,
            entryScaleFactor: dto.entryScaleFactor,
            comment: dto.comment,
            entryUserId: userId,
            entryDateTime: DateUtils.getTodayDateInSQLFormat(),
        };
    }

    private updateElementEntity(entity: ElementEntity, dto: CreateElementDto, userId: number): void {
        entity.name = dto.name;
        entity.abbreviation = dto.abbreviation;
        entity.description = dto.description;
        entity.typeId = dto.typeId;
        entity.lowerLimit = dto.lowerLimit;
        entity.upperLimit = dto.upperLimit;
        entity.entryScaleFactor = dto.entryScaleFactor;
        entity.comment = dto.comment;
        entity.entryUserId = userId;
        entity.entryDateTime = DateUtils.getTodayDateInSQLFormat();
        entity.log = ObjectUtils.getNewLog<ElementLogVo>(entity.log, this.getElementLogFromEntity(entity));
    }


}
