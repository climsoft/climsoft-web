import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ViewGeneralSettingModel } from '../dtos/view-general-setting.model';
import { GeneralSettingEntity } from '../entities/general-setting.entity';
import { GeneralSettingParameters, UpdateGeneralSettingParametersDto } from '../dtos/update-general-setting-params.dto';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';
import { SettingIdEnum } from '../dtos/setting-id.enum';

@Injectable()
export class GeneralSettingsService implements OnModuleInit {
    private readonly cache: MetadataCache<ViewGeneralSettingModel>;

    constructor(
        @InjectRepository(GeneralSettingEntity) private generalSettingRepo: Repository<GeneralSettingEntity>,
        private eventEmitter: EventEmitter2,
    ) {
        this.cache = new MetadataCache<ViewGeneralSettingModel>(
            'GeneralSettings',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<ViewGeneralSettingModel>> {
        const entities = await this.generalSettingRepo.find({ order: { id: "ASC" } });
        const records = entities.map(entity => this.createViewDto(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public findOne(id: number): ViewGeneralSettingModel {
        const dto = this.cache.getById(id);
        if (!dto) {
            throw new NotFoundException(`Entity #${id} not found`);
        }
        return dto;
    }

    public findAll(): ViewGeneralSettingModel[] {
        return this.cache.getAll();
    }

    /**
     * Used when user is updating the settings parameters
     */
    public async update(id: SettingIdEnum, dto: UpdateGeneralSettingParametersDto, userId: number): Promise<ViewGeneralSettingModel> {
        const entity = await this.generalSettingRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Setting #${id} not found`);
        }
        entity.parameters = dto.parameters;
        entity.entryUserId = userId;
        const saved = await this.generalSettingRepo.save(entity);
        await this.cache.invalidate();
        const viewDto = this.createViewDto(saved);
        this.eventEmitter.emit('setting.updated', { id, viewDto });
        return viewDto;
    }

    /**
     * Used by migration service to save default settings
     */
    public async put(id: SettingIdEnum, name: string, description: string, parameters: GeneralSettingParameters, userId: number): Promise<ViewGeneralSettingModel> {
        let entity = await this.generalSettingRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            entity = this.generalSettingRepo.create({
                id: id,
            });
        }

        entity.name = name;
        entity.description = description;
        entity.parameters = parameters;
        entity.entryUserId = userId;

        const saved = await this.generalSettingRepo.save(entity);
        await this.cache.invalidate();
        const viewDto = this.createViewDto(saved);
        console.log('emitting dto ')
        this.eventEmitter.emit('setting.updated', { id, viewDto });
        return viewDto;
    }

    public count(): number {
        return this.cache.getCount();
    }

    private createViewDto(entity: GeneralSettingEntity): ViewGeneralSettingModel {
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
