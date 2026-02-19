import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StationEntity } from '../entities/station.entity';
import { UpdateStationDto } from '../dtos/update-station.dto';
import { CreateStationDto } from '../dtos/create-update-station.dto';
import { ViewStationQueryDTO } from '../dtos/view-station-query.dto';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';

@Injectable()
export class StationsService implements OnModuleInit {
    private readonly cache: MetadataCache<CreateStationDto>;

    constructor(
        @InjectRepository(StationEntity) private readonly stationRepo: Repository<StationEntity>,
    ) {
        this.cache = new MetadataCache<CreateStationDto>(
            'Stations',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<CreateStationDto>> {
        const entities = await this.stationRepo.find({ order: { id: "ASC" } });
        const records = entities.map(entity => this.createViewDto(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public find(viewStationQueryDto?: ViewStationQueryDTO): CreateStationDto[] {
        let results = this.cache.getAll();

        if (viewStationQueryDto) {
            // Apply filters
            if (viewStationQueryDto.stationIds) {
                const idSet = new Set(viewStationQueryDto.stationIds);
                results = results.filter(dto => idSet.has(dto.id));
            }

            if (viewStationQueryDto.obsProcessingMethods) {
                const methodSet = new Set(viewStationQueryDto.obsProcessingMethods);
                results = results.filter(dto => methodSet.has(dto.stationObsProcessingMethod));
            }

            if (viewStationQueryDto.obsEnvironmentIds) {
                const envIdSet = new Set(viewStationQueryDto.obsEnvironmentIds);
                results = results.filter(dto => dto.stationObsEnvironmentId !== null && dto.stationObsEnvironmentId !== undefined && envIdSet.has(dto.stationObsEnvironmentId));
            }

            if (viewStationQueryDto.obsFocusIds) {
                const focusIdSet = new Set(viewStationQueryDto.obsFocusIds);
                results = results.filter(dto => dto.stationObsFocusId !== null && dto.stationObsFocusId !== undefined && focusIdSet.has(dto.stationObsFocusId));
            }

            // Apply pagination
            if (viewStationQueryDto.page && viewStationQueryDto.page > 0 && viewStationQueryDto.pageSize) {
                const skip = (viewStationQueryDto.page - 1) * viewStationQueryDto.pageSize;
                results = results.slice(skip, skip + viewStationQueryDto.pageSize);
            }
        }

        return results;
    }

    public count(viewStationQueryDto: ViewStationQueryDTO): number {
        let results = this.cache.getAll();

        if (viewStationQueryDto.stationIds) {
            const idSet = new Set(viewStationQueryDto.stationIds);
            results = results.filter(dto => idSet.has(dto.id));
        }

        if (viewStationQueryDto.obsProcessingMethods) {
            const methodSet = new Set(viewStationQueryDto.obsProcessingMethods);
            results = results.filter(dto => methodSet.has(dto.stationObsProcessingMethod));
        }

        if (viewStationQueryDto.obsEnvironmentIds) {
            const envIdSet = new Set(viewStationQueryDto.obsEnvironmentIds);
            results = results.filter(dto => dto.stationObsEnvironmentId !== null && dto.stationObsEnvironmentId !== undefined && envIdSet.has(dto.stationObsEnvironmentId));
        }

        if (viewStationQueryDto.obsFocusIds) {
            const focusIdSet = new Set(viewStationQueryDto.obsFocusIds);
            results = results.filter(dto => dto.stationObsFocusId !== null && dto.stationObsFocusId !== undefined && focusIdSet.has(dto.stationObsFocusId));
        }

        return results.length;
    }

    public findOne(id: string): CreateStationDto {
        const dto = this.cache.getById(id);
        if (!dto) {
            throw new NotFoundException(`Station #${id} not found`);
        }
        return dto;
    }

    public async add(createDto: CreateStationDto, userId: number): Promise<CreateStationDto> {
        let entity: StationEntity | null = await this.stationRepo.findOneBy({
            id: createDto.id,
        });

        if (entity) {
            throw new NotFoundException(`Station #${createDto.id} exists`);
        }

        entity = this.stationRepo.create({
            id: createDto.id,
        });

        this.updateEntity(entity, createDto, userId);

        await this.stationRepo.save(entity);
        await this.cache.invalidate();

        return this.findOne(entity.id);
    }

    public async update(id: string, updateDto: UpdateStationDto, userId: number): Promise<CreateStationDto> {
        const entity: StationEntity = await this.getEntity(id);
        this.updateEntity(entity, updateDto, userId);
        await this.stationRepo.save(entity);
        await this.cache.invalidate();
        return this.createViewDto(entity);
    }

    public async delete(id: string): Promise<string> {
        await this.stationRepo.remove(await this.getEntity(id));
        await this.cache.invalidate();
        return id;
    }

    private async getEntity(id: string): Promise<StationEntity> {
        const entity = await this.stationRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Station #${id} not found`);
        }
        return entity;
    }

    private updateEntity(entity: StationEntity, dto: UpdateStationDto, userId: number): void {
        entity.name = dto.name;
        entity.description = dto.description ? dto.description : '';
        entity.location = (dto.longitude !== undefined && dto.longitude !== null) && (dto.latitude !== undefined && dto.latitude !== null) ? {
            type: "Point",
            coordinates: [dto.longitude, dto.latitude],
        } : null;
        entity.elevation = (dto.elevation !== undefined && dto.elevation !== null) ? dto.elevation : null;
        entity.obsProcessingMethod = dto.stationObsProcessingMethod;
        entity.obsEnvironmentId = dto.stationObsEnvironmentId ? dto.stationObsEnvironmentId : null;
        entity.obsFocusId = dto.stationObsFocusId ? dto.stationObsFocusId : null;
        entity.organisationId = dto.organisationId ? dto.organisationId : null;
        entity.wmoId = dto.wmoId ? dto.wmoId : null;
        entity.wigosId = dto.wigosId ? dto.wigosId : null;
        entity.icaoId = dto.icaoId ? dto.icaoId : null;
        entity.status = dto.status ? dto.status : null;
        entity.dateEstablished = dto.dateEstablished ? new Date(dto.dateEstablished) : null;
        entity.dateClosed = dto.dateClosed ? new Date(dto.dateClosed) : null;
        entity.comment = dto.comment ? dto.comment : null;
        entity.entryUserId = userId;
    }

    private createViewDto(entity: StationEntity): CreateStationDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            longitude: entity.location ? entity.location.coordinates[0] : null,
            latitude: entity.location ? entity.location.coordinates[1] : null,
            elevation: entity.elevation,
            stationObsProcessingMethod: entity.obsProcessingMethod,
            stationObsEnvironmentId: entity.obsEnvironmentId,
            stationObsFocusId: entity.obsFocusId,
            organisationId: entity.organisationId,
            wmoId: entity.wmoId,
            wigosId: entity.wigosId,
            icaoId: entity.icaoId,
            status: entity.status,
            dateEstablished: entity.dateEstablished ? entity.dateEstablished.toISOString() : null,
            dateClosed: entity.dateClosed ? entity.dateClosed.toISOString() : null,
            comment: entity.comment,
        }
    }

    public async bulkPut(dtos: CreateStationDto[], userId: number) {
        const entities: StationEntity[] = [];
        for (const dto of dtos) {
            const entity: StationEntity = await this.stationRepo.create({
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

    private async insertOrUpdateValues(entities: StationEntity[]): Promise<void> {
        await this.stationRepo
            .createQueryBuilder()
            .insert()
            .into(StationEntity)
            .values(entities)
            .orUpdate(
                [
                    "name",
                    "description",
                    "observation_processing_method",
                    "location",
                    "elevation",
                    "observation_environment_id",
                    "observation_focus_id",
                    "organisation_id",
                    "wmo_id",
                    "wigos_id",
                    "icao_id",
                    "status",
                    "date_established",
                    "date_closed",
                    "comment",
                    "entry_user_id"
                ],
                ["id"],
                {
                    skipUpdateIfNoValuesChanged: true,
                }
            )
            .execute();
    }

    public async deleteAll(): Promise<boolean> {
        const entities: StationEntity[] = await this.stationRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.stationRepo.remove(entities);
        await this.cache.invalidate();
        return true;
    }

    public checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): MetadataUpdatesDto {
        return this.cache.checkUpdates(updatesQueryDto);
    }

}
