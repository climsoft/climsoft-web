import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Repository } from 'typeorm';
import { ElementEntity, ElementLogVo } from '../entities/element.entity';
import { UpdateElementDto } from '../dtos/update-element.dto';
import { ObjectUtils } from 'src/shared/utils/object.util';
import { ViewElementDto } from '../dtos/view-element.dto';

@Injectable()
export class ElementsService {
    constructor(@InjectRepository(ElementEntity) private readonly elementRepo: Repository<ElementEntity>,
    ) { }

    public async findElements(ids?: number[]): Promise<ViewElementDto[]> {
        const findOptions: FindManyOptions<ElementEntity> = {
            order: { id: "ASC" }
        };

        if (ids && ids.length > 0) {
            findOptions.where = { id: In(ids) };
        }

        const entities = await this.elementRepo.find(findOptions);

        return entities.map(entity => {
            return this.createViewDto(entity);
        });
    }

    public async findElement(id: number): Promise<ViewElementDto> {
        const elementEntity: ElementEntity = await this.getElementEntity(id);
        return this.createViewDto(elementEntity);
    }

    public async saveElement(id: number, updateElementDto: UpdateElementDto, userId: number): Promise<ViewElementDto> {
        const elementEntity: ElementEntity = await this.getElementEntity(id);
        const oldChanges: ElementLogVo = this.getElementLogFromEntity(elementEntity);
        const newChanges: ElementLogVo = this.getElementLogFromDto(updateElementDto, userId);

        //if no changes, then no need to save
        if (!ObjectUtils.areObjectsEqual<ElementLogVo>(oldChanges, newChanges, ["entryUserId", "entryDateTime"])) {
            this.updateElementEntity(elementEntity, updateElementDto, userId);
            await this.elementRepo.save(elementEntity);
        }

        return this.createViewDto(elementEntity);

    }

    private getElementLogFromEntity(entity: ElementEntity): ElementLogVo {
        return {
            lowerLimit: entity.lowerLimit,
            upperLimit: entity.upperLimit,
            entryScaleFactor: entity.entryScaleFactor,
            comment: entity.comment,
            entryUserId: entity.entryUserId,
            entryDateTime: entity.entryDateTime.toISOString()
        };
    }

    private getElementLogFromDto(dto: UpdateElementDto, userId: number): ElementLogVo {
        return {
            lowerLimit: dto.lowerLimit,
            upperLimit: dto.upperLimit,
            entryScaleFactor: dto.entryScaleFactor,
            comment: dto.comment,
            entryUserId: userId,
            entryDateTime: new Date().toISOString()
        };
    }

    private updateElementEntity(entity: ElementEntity, dto: UpdateElementDto, userId: number): void {
        // Note, log has to be set before updating the new values to the entity, because we are logging previous values.
        entity.log = ObjectUtils.getNewLog<ElementLogVo>(entity.log, this.getElementLogFromEntity(entity));

        entity.lowerLimit = dto.lowerLimit;
        entity.upperLimit = dto.upperLimit;
        entity.entryScaleFactor = dto.entryScaleFactor;
        entity.comment = dto.comment;
        entity.entryUserId = userId;
        entity.entryDateTime = new Date();

    }


    /**
     * Tries to find the element with the passed id, if not found throws a NOT FOUND error
     * @param id 
     * @returns 
     */
    private async getElementEntity(id: number): Promise<ElementEntity> {
        const elementEntity: ElementEntity | null = await this.elementRepo.findOneBy({
            id: id,
        });

        if (!elementEntity) {
            throw new NotFoundException(`Element #${id} not found`);
        }
        return elementEntity;
    }

    private createViewDto(entity: ElementEntity): ViewElementDto {
        return {
            id: entity.id,
            abbreviation: entity.abbreviation,
            name: entity.name,
            description: entity.description,
            units: entity.units,
            type: entity.elementType.name,
            subdomain: entity.elementType.elementSubdomain.name,
            domain: entity.elementType.elementSubdomain.domain,
            lowerLimit: entity.lowerLimit,
            upperLimit: entity.upperLimit,
            entryScaleFactor: entity.entryScaleFactor,
            comment: entity.comment,
        }
    }




}
