import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { ViewOrganisationDto } from '../../organisations/dtos/view-organisation.dto';
import { ViewOrganisationQueryDTO } from '../../organisations/dtos/view-organisation-query.dto';
import { CreateUpdateOrganisationDto } from '../../organisations/dtos/create-update-organisation.dto';
import { OrganisationEntity } from '../entities/organisation.entity';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';

@Injectable()
export class OrganisationsService implements OnModuleInit {
    private readonly cache: MetadataCache<ViewOrganisationDto>;

    constructor(
        @InjectRepository(OrganisationEntity) private organisationsRepo: Repository<OrganisationEntity>,
    ) {
        this.cache = new MetadataCache<ViewOrganisationDto>(
            'Organisations',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<ViewOrganisationDto>> {
        const entities = await this.organisationsRepo.find({ order: { id: "ASC" } });
        const records = entities.map(entity => this.createViewDto(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public findOne(id: number): ViewOrganisationDto {
        const dto = this.cache.getById(id);
        if (!dto) {
            throw new NotFoundException(`Organisation #${id} not found`);
        }
        return dto;
    }

    public find(queryDto?: ViewOrganisationQueryDTO): ViewOrganisationDto[] {
        let results = this.cache.getAll();

        if (queryDto) {
            if (queryDto.organisationIds) {
                const idSet = new Set(queryDto.organisationIds);
                results = results.filter(dto => idSet.has(dto.id));
            }

            // Apply pagination
            if (queryDto.page && queryDto.page > 0 && queryDto.pageSize) {
                const skip = (queryDto.page - 1) * queryDto.pageSize;
                results = results.slice(skip, skip + queryDto.pageSize);
            }
        }

        return results;
    }

    public count(viewRegionQueryDto: ViewOrganisationQueryDTO): number {
        let results = this.cache.getAll();

        if (viewRegionQueryDto.organisationIds) {
            const idSet = new Set(viewRegionQueryDto.organisationIds);
            results = results.filter(dto => idSet.has(dto.id));
        }

        return results.length;
    }

    private async findEntity(id: number): Promise<OrganisationEntity> {
        const entity = await this.organisationsRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Organisation #${id} not found`);
        }
        return entity;
    }

    public async add(createDto: CreateUpdateOrganisationDto, userId: number): Promise<ViewOrganisationDto> {
        let entity: OrganisationEntity | null = await this.organisationsRepo.findOneBy({
            name: createDto.name,
        });

        if (entity) {
            throw new NotFoundException(`Organisation with name ${createDto.name} exists`);
        }

        entity = this.organisationsRepo.create({
            name: createDto.name,
        });

        this.updateEntity(entity, createDto, userId);

        await this.organisationsRepo.save(entity);
        await this.cache.invalidate();

        return this.findOne(entity.id);

    }

    public async update(id: number, updateDto: CreateUpdateOrganisationDto, userId: number): Promise<ViewOrganisationDto> {
        const entity: OrganisationEntity = await this.findEntity(id);

        this.updateEntity(entity, updateDto, userId);

        await this.organisationsRepo.save(entity);
        await this.cache.invalidate();

        return this.createViewDto(entity);
    }

    public async delete(id: number): Promise<number> {
        await this.organisationsRepo.remove(await this.findEntity(id));
        await this.cache.invalidate();
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities: OrganisationEntity[] = await this.organisationsRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.organisationsRepo.remove(entities);
        await this.cache.invalidate();
        return true;
    }

    private updateEntity(entity: OrganisationEntity, dto: CreateUpdateOrganisationDto, userId: number): void {
        entity.name = dto.name;
        entity.description = dto.description ? dto.description : null;
        entity.extraMetadata = dto.extraMetadata ? dto.extraMetadata : null;
        entity.comment = dto.comment ? dto.comment : null;
        entity.entryUserId = userId;
    }

    private createViewDto(entity: OrganisationEntity): ViewOrganisationDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            extraMetadata: entity.extraMetadata,
            comment: entity.comment,
        };
    }

    public checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): MetadataUpdatesDto {
        return this.cache.checkUpdates(updatesQueryDto);
    }

}
