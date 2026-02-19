import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { NetworkAffiliationEntity } from '../entities/network-affiliation.entity';
import { ViewNetworkAffiliationDto } from '../dtos/view-network-affiliation.dto';
import { ViewNetworkAffiliationQueryDTO } from '../dtos/view-network-affiliation-query.dto';
import { CreateUpdateNetworkAffiliationDto } from '../dtos/create-update-network-affiliation.dto';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';

@Injectable()
export class NetworkAffiliationsService implements OnModuleInit {
    private readonly cache: MetadataCache<ViewNetworkAffiliationDto>;

    constructor(
        @InjectRepository(NetworkAffiliationEntity) private networkAffiliationsRepo: Repository<NetworkAffiliationEntity>,
    ) {
        this.cache = new MetadataCache<ViewNetworkAffiliationDto>(
            'NetworkAffiliations',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<ViewNetworkAffiliationDto>> {
        const entities = await this.networkAffiliationsRepo.find({ order: { id: "ASC" } });
        const records = entities.map(entity => this.createViewDto(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public findOne(id: number): ViewNetworkAffiliationDto {
        const dto = this.cache.getById(id);
        if (!dto) {
            throw new NotFoundException(`Network affiliation #${id} not found`);
        }
        return dto;
    }

    public find(queryDto?: ViewNetworkAffiliationQueryDTO): ViewNetworkAffiliationDto[] {
        let results = this.cache.getAll();

        if (queryDto) {
            if (queryDto.networkAffiliationIds) {
                const idSet = new Set(queryDto.networkAffiliationIds);
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

    public count(viewRegionQueryDto: ViewNetworkAffiliationQueryDTO): number {
        let results = this.cache.getAll();

        if (viewRegionQueryDto.networkAffiliationIds) {
            const idSet = new Set(viewRegionQueryDto.networkAffiliationIds);
            results = results.filter(dto => idSet.has(dto.id));
        }

        return results.length;
    }

    private async findEntity(id: number): Promise<NetworkAffiliationEntity> {
        const entity = await this.networkAffiliationsRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Network affiliation #${id} not found`);
        }
        return entity;
    }

    public async add(createDto: CreateUpdateNetworkAffiliationDto, userId: number): Promise<ViewNetworkAffiliationDto> {
        let entity: NetworkAffiliationEntity | null = await this.networkAffiliationsRepo.findOneBy({
            name: createDto.name,
        });

        if (entity) {
            throw new NotFoundException(`Network affiliation with name ${createDto.name} exists`);
        }

        entity = this.networkAffiliationsRepo.create({
            name: createDto.name,
        });

        this.updateEntity(entity, createDto, userId);

        await this.networkAffiliationsRepo.save(entity);
        await this.cache.invalidate();

        return this.findOne(entity.id);

    }

    public async update(id: number, updateDto: CreateUpdateNetworkAffiliationDto, userId: number): Promise<ViewNetworkAffiliationDto> {
        const entity: NetworkAffiliationEntity = await this.findEntity(id);

        this.updateEntity(entity, updateDto, userId);

        await this.networkAffiliationsRepo.save(entity);
        await this.cache.invalidate();

        return this.createViewDto(entity);
    }

    public async delete(id: number): Promise<number> {
        await this.networkAffiliationsRepo.remove(await this.findEntity(id));
        await this.cache.invalidate();
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities: NetworkAffiliationEntity[] = await this.networkAffiliationsRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.networkAffiliationsRepo.remove(entities);
        await this.cache.invalidate();
        return true;
    }

    private updateEntity(entity: NetworkAffiliationEntity, dto: CreateUpdateNetworkAffiliationDto, userId: number): void {
        entity.name = dto.name;
        entity.description = dto.description ? dto.description : null;
        entity.parentNetworkId = dto.parentNetworkId;
        entity.extraMetadata = dto.extraMetadata ? dto.extraMetadata : null;
        entity.comment = dto.comment ? dto.comment : null;
        entity.entryUserId = userId;
    }

    private createViewDto(entity: NetworkAffiliationEntity): ViewNetworkAffiliationDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            parentNetworkId: entity.parentNetworkId,
            extraMetadata: entity.extraMetadata,
            comment: entity.comment,
        };
    }

    public checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): MetadataUpdatesDto {
        return this.cache.checkUpdates(updatesQueryDto);
    }

}
