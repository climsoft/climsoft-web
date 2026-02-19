import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElementEntity } from '../../elements/entities/element.entity';
import { CreateViewElementDto } from '../dtos/elements/create-view-element.dto';
import { UpdateElementDto } from '../dtos/elements/update-element.dto';
import { ViewElementQueryDTO } from '../dtos/elements/view-element-query.dto';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';

@Injectable()
export class ElementsService implements OnModuleInit {
    private readonly cache: MetadataCache<CreateViewElementDto>;

    constructor(
        @InjectRepository(ElementEntity) private elementRepo: Repository<ElementEntity>,
    ) {
        this.cache = new MetadataCache<CreateViewElementDto>(
            'Elements',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<CreateViewElementDto>> {
        const entities = await this.elementRepo.find({ order: { id: "ASC" } });
        const records = entities.map(entity => this.createViewDto(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public findOne(id: number): CreateViewElementDto {
        const dto = this.cache.getById(id);
        if (!dto) {
            throw new NotFoundException(`Element #${id} not found`);
        }
        return dto;
    }

    public find(viewElementQueryDto?: ViewElementQueryDTO): CreateViewElementDto[] {
        let results = this.cache.getAll();

        if (viewElementQueryDto) {
            // Apply filters
            if (viewElementQueryDto.elementIds) {
                const idSet = new Set(viewElementQueryDto.elementIds);
                results = results.filter(dto => idSet.has(dto.id));
            }

            if (viewElementQueryDto.typeIds) {
                const typeIdSet = new Set(viewElementQueryDto.typeIds);
                results = results.filter(dto => typeIdSet.has(dto.typeId));
            }

            // Apply pagination
            if (viewElementQueryDto.page && viewElementQueryDto.page > 0 && viewElementQueryDto.pageSize) {
                const skip = (viewElementQueryDto.page - 1) * viewElementQueryDto.pageSize;
                results = results.slice(skip, skip + viewElementQueryDto.pageSize);
            }
        }

        return results;
    }

    public count(viewStationQueryDto: ViewElementQueryDTO): number {
        let results = this.cache.getAll();

        if (viewStationQueryDto.elementIds) {
            const idSet = new Set(viewStationQueryDto.elementIds);
            results = results.filter(dto => idSet.has(dto.id));
        }

        if (viewStationQueryDto.typeIds) {
            const typeIdSet = new Set(viewStationQueryDto.typeIds);
            results = results.filter(dto => typeIdSet.has(dto.typeId));
        }

        return results.length;
    }

    public async add(createDto: CreateViewElementDto, userId: number): Promise<CreateViewElementDto> {
        let entity: ElementEntity | null = await this.elementRepo.findOneBy({
            id: createDto.id,
        });

        if (entity) {
            throw new NotFoundException(`Element #${createDto.id} exists `);
        }

        entity = this.elementRepo.create({
            id: createDto.id,
        });

        this.updateEntity(entity, createDto, userId);

        await this.elementRepo.save(entity);
        await this.cache.invalidate();

        return this.findOne(entity.id);

    }

    public async update(id: number, updateDto: UpdateElementDto, userId: number): Promise<CreateViewElementDto> {
        const entity: ElementEntity = await this.findEntity(id);

        this.updateEntity(entity, updateDto, userId);

        await this.elementRepo.save(entity);
        await this.cache.invalidate();

        return this.createViewDto(entity);
    }

    public async delete(id: number): Promise<number> {
        await this.elementRepo.remove(await this.findEntity(id));
        await this.cache.invalidate();
        return id;
    }

    public async bulkPut(dtos: CreateViewElementDto[], userId: number) {
        const entities: ElementEntity[] = [];
        for (const dto of dtos) {
            const entity: ElementEntity = await this.elementRepo.create({
                id: dto.id,
            });

            this.updateEntity(entity, dto, userId);
            entities.push(entity);
        }

        const batchSize = 1000;
        for (let i = 0; i < entities.length; i += batchSize) {
            const batch = entities.slice(i, i + batchSize);
            await this.insertOrUpdateValues(batch);
        }

        await this.cache.invalidate();
    }

    private async insertOrUpdateValues(entities: ElementEntity[]): Promise<void> {
        await this.elementRepo
            .createQueryBuilder()
            .insert()
            .into(ElementEntity)
            .values(entities)
            .orUpdate(
                [
                    "abbreviation",
                    "name",
                    "description",
                    "units",
                    "type_id",
                    "entry_scale_factor",
                    "comment",
                    "entry_user_id",
                ],
                ["id"],
                {
                    skipUpdateIfNoValuesChanged: true,
                }
            )
            .execute();
    }

    public async deleteAll(): Promise<boolean> {
        const entities: ElementEntity[] = await this.elementRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.elementRepo.remove(entities);
        await this.cache.invalidate();
        return true;
    }

    private updateEntity(entity: ElementEntity, dto: UpdateElementDto, userId: number): void {
        entity.abbreviation = dto.abbreviation;
        entity.name = dto.name;
        entity.description = dto.description ? dto.description : null;
        entity.units = dto.units;
        entity.typeId = dto.typeId;
        entity.entryScaleFactor = dto.entryScaleFactor ? dto.entryScaleFactor : null;
        entity.comment = dto.comment ? dto.comment : null;
        entity.entryUserId = userId;
    }

    /**
     * Tries to find the element with the passed id, if not found throws a NOT FOUND error
     */
    private async findEntity(id: number): Promise<ElementEntity> {
        const elementEntity: ElementEntity | null = await this.elementRepo.findOneBy({
            id: id,
        });

        if (!elementEntity) {
            throw new NotFoundException(`Element #${id} not found`);
        }
        return elementEntity;
    }

    private createViewDto(entity: ElementEntity): CreateViewElementDto {
        return {
            id: entity.id,
            abbreviation: entity.abbreviation,
            name: entity.name,
            description: entity.description,
            units: entity.units,
            typeId: entity.typeId,
            entryScaleFactor: entity.entryScaleFactor,
            comment: entity.comment,
        }
    }

    public checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): MetadataUpdatesDto {
        return this.cache.checkUpdates(updatesQueryDto);
    }

}
