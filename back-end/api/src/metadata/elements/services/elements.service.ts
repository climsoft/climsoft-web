import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Repository } from 'typeorm';
import { ElementEntity, ElementLogVo } from '../../elements/entities/element.entity';
import { UpdateElementDto } from '../../elements/dtos/update-element.dto';
import { ObjectUtils } from 'src/shared/utils/object.util';
import { ViewElementDto } from '../../elements/dtos/view-element.dto';
import { CreateElementDto } from '../../elements/dtos/create-element.dto';
import { ElementSubdomainEntity } from '../../elements/entities/element-subdomain.entity';
import { ElementTypeEntity } from '../../elements/entities/element-type.entity';
import { ViewElementTypeDto } from '../../elements/dtos/view-element-type.dto';
import { StringUtils } from 'src/shared/utils/string.utils';
import { IBaseNumberService } from 'src/shared/services/base-number-service.interface.';

@Injectable()
export class ElementsService implements IBaseNumberService<CreateElementDto,UpdateElementDto, ViewElementDto> {
    constructor(
        @InjectRepository(ElementEntity) private readonly elementRepo: Repository<ElementEntity>,
        @InjectRepository(ElementSubdomainEntity) private readonly elementSubdomainRepo: Repository<ElementSubdomainEntity>,
        @InjectRepository(ElementTypeEntity) private readonly elementTypeRepo: Repository<ElementTypeEntity>,
    ) {

    }

    public async findOne(id: number): Promise<ViewElementDto> {
        return this.createViewDto(await this.getEntity(id));
    }

    public async findSome(ids: number[]): Promise<ViewElementDto[]> {
        const entities = await this.elementRepo.find({
            order: { id: "ASC" },
            where: { id: In(ids) }
        });

        return entities.map(entity => {
            return this.createViewDto(entity);
        });
    }
    public async findAll(): Promise<ViewElementDto[]> {
        const entities = await this.elementRepo.find({
            order: { id: "ASC" }
        });

        return entities.map(entity => {
            return this.createViewDto(entity);
        });
    }


    public async create(createDto: CreateElementDto, userId: number): Promise<ViewElementDto> {

        let entity: ElementEntity | null = await this.elementRepo.findOneBy({
            id: createDto.id,
        });

        if (entity) {
            throw new NotFoundException(`Element #${createDto.id} exists `);
        }

        entity = this.elementRepo.create({
            id: createDto.id,
        });

        this.updateElementEntity(entity, createDto, userId, true);

        await this.elementRepo.save(entity);

        // Important. Retrieve the entity with updated properties like type name before creating the view
        return this.findOne(entity.id);

    }

    public async update(id: number, updateDto: UpdateElementDto, userId: number): Promise<ViewElementDto> {
        const entity: ElementEntity = await this.getEntity(id);
        const oldChanges: ElementLogVo = this.getElementLogFromEntity(entity);
        const newChanges: ElementLogVo = this.getElementLogFromDto(updateDto, userId);

        //if no changes, then no need to save
        if (!ObjectUtils.areObjectsEqual<ElementLogVo>(oldChanges, newChanges, ["entryUserId", "entryDateTime"])) {
            this.updateElementEntity(entity, updateDto, userId, false);

            await this.elementRepo.save(entity);
        }

        return this.createViewDto(entity);
    }

    public async delete(id: number, userId: number): Promise<number> {
        await this.elementRepo.remove(await this.getEntity(id));
        return id;
    }

    private getElementLogFromEntity(entity: ElementEntity): ElementLogVo {
        return {
            abbreviation: entity.abbreviation,
            name: entity.name,
            description: entity.description,
            units: entity.units,
            typeId: entity.typeId,
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
            abbreviation: dto.abbreviation,
            name: dto.name,
            description: dto.description,
            units: dto.units,
            typeId: dto.typeId,
            lowerLimit: dto.lowerLimit,
            upperLimit: dto.upperLimit,
            entryScaleFactor: dto.entryScaleFactor,
            comment: dto.comment,
            entryUserId: userId,
            entryDateTime: new Date().toISOString()
        };
    }

    private updateElementEntity(entity: ElementEntity, dto: UpdateElementDto, userId: number, newEntity: boolean): void {
        // Note, log has to be set before updating the new values to the entity, because we are logging previous values.
        entity.log = newEntity ? null : ObjectUtils.getNewLog<ElementLogVo>(entity.log, this.getElementLogFromEntity(entity));

        entity.abbreviation = dto.abbreviation;
        entity.name = dto.name;
        entity.description = dto.description;
        entity.units = dto.units;
        entity.typeId = dto.typeId
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
    private async getEntity(id: number): Promise<ElementEntity> {
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
            typeId: entity.elementType.id,
            typeName: entity.elementType.name,
            subdomainName: entity.elementType.elementSubdomain.name,
            domain: entity.elementType.elementSubdomain.domain,
            lowerLimit: entity.lowerLimit,
            upperLimit: entity.upperLimit,
            entryScaleFactor: entity.entryScaleFactor,
            comment: entity.comment,
        }
    }


    // TODO. Move this to its own subdomain
    public async findElementSubdomains(): Promise<ElementSubdomainEntity[]> {
        const findOptions: FindManyOptions<ElementSubdomainEntity> = {
            order: { id: "ASC" }
        };

        // if (domain) {
        //     findOptions.where = { domain: domain };
        // }

        return this.elementSubdomainRepo.find(findOptions);
    }

    // Move this to its own subdomain
    public async findElementTypes(ids?: number[]): Promise<ViewElementTypeDto[]> {
        const findOptions: FindManyOptions<ElementTypeEntity> = {
            order: { id: "ASC" }
        };

        if (ids && ids.length > 0) {
            findOptions.where = { id: In(ids) };
        }

        const dtos: ViewElementTypeDto[] = (await this.elementTypeRepo.find(findOptions)).map(item => {
            return {
                id: item.id,
                name: item.name,
                description: item.description,
                subdomainName: item.elementSubdomain.name,
                domainName: StringUtils.capitalizeFirstLetter(item.elementSubdomain.domain),
            };

        });

        return dtos;
    }




}
