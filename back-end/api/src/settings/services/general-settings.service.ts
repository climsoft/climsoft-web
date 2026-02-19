import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateViewGeneralSettingDto } from '../dtos/create-view-general-setting.dto';
import { GeneralSettingEntity } from '../entities/general-setting.entity';
import { UpdateGeneralSettingDto } from '../dtos/update-general-setting.dto';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';

@Injectable()
export class GeneralSettingsService implements OnModuleInit {
    private readonly cache: MetadataCache<CreateViewGeneralSettingDto>;

    constructor(
        @InjectRepository(GeneralSettingEntity) private generalSettingRepo: Repository<GeneralSettingEntity>
    ) {
        this.cache = new MetadataCache<CreateViewGeneralSettingDto>(
            'GeneralSettings',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<CreateViewGeneralSettingDto>> {
        const entities = await this.generalSettingRepo.find({ order: { id: "ASC" } });
        const records = entities.map(entity => this.createViewDto(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public find(id: number): CreateViewGeneralSettingDto {
        const dto = this.cache.getById(id);
        if (!dto) {
            throw new NotFoundException(`Entity #${id} not found`);
        }
        return dto;
    }

    public findAll(): CreateViewGeneralSettingDto[] {
        return this.cache.getAll();
    }

    /**
     * Used when user is updating the settings parameters
     */
    public async update(id: number, dto: UpdateGeneralSettingDto, userId: number): Promise<CreateViewGeneralSettingDto> {
        const entity = await this.findEntity(id);
        entity.parameters = dto.parameters;
        entity.entryUserId = userId;
        const saved = await this.generalSettingRepo.save(entity);
        await this.cache.invalidate();
        return this.createViewDto(saved);
    }

    /**
     * Used by migration service to save default settings
     */
    public async bulkPut(dtos: CreateViewGeneralSettingDto[], userId: number): Promise<number> {
        const entities: GeneralSettingEntity[] = [];
        for (const dto of dtos) {
            let entity = await this.generalSettingRepo.findOneBy({
                id: dto.id,
            });

            if (!entity) {
                entity = await this.generalSettingRepo.create({
                    id: dto.id,
                });
            }

            entity.name = dto.name;
            entity.description = dto.description;
            entity.parameters = dto.parameters;
            entity.entryUserId = userId;
            entities.push(entity);
        }

        const savedEntities = await this.generalSettingRepo.save(entities);
        await this.cache.invalidate();
        return savedEntities.length;
    }

    public count(): number {
        return this.cache.getCount();
    }

    private async findEntity(id: number): Promise<GeneralSettingEntity> {
        const entity = await this.generalSettingRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Entity #${id} not found`);
        }
        return entity;
    }

    private createViewDto(entity: GeneralSettingEntity): CreateViewGeneralSettingDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            parameters: entity.parameters
        };
    }

    public checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): MetadataUpdatesDto {
        return this.cache.checkUpdates(updatesQueryDto);
    }

}
