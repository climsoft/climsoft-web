import { Repository } from "typeorm";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { StationObservationEnvironmentEntity } from "../entities/station-observation-environment.entity";
import { MetadataUpdatesQueryDto } from "src/metadata/metadata-updates/dtos/metadata-updates-query.dto";
import { MetadataUpdatesDto } from "src/metadata/metadata-updates/dtos/metadata-updates.dto";
import { StationObservationEnvironmentDto } from "../dtos/view-station-obs-env.dto";
import { CacheLoadResult, MetadataCache } from "src/shared/cache/metadata-cache";

@Injectable()
export class StationObsEnvService implements OnModuleInit {
    private readonly cache: MetadataCache<StationObservationEnvironmentDto>;

    public constructor(
        @InjectRepository(StationObservationEnvironmentEntity) private stationObsEnvRepo: Repository<StationObservationEnvironmentEntity>) {
        this.cache = new MetadataCache<StationObservationEnvironmentDto>(
            'StationObsEnv',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<StationObservationEnvironmentDto>> {
        const entities = await this.stationObsEnvRepo.find({ order: { id: "ASC" } });
        const records = entities.map(item => ({
            id: item.id, name: item.name, description: item.description
        }));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public find(ids?: number[]): StationObservationEnvironmentDto[] {
        const all = this.cache.getAll();
        if (ids && ids.length > 0) {
            const idSet = new Set(ids);
            return all.filter(item => idSet.has(item.id));
        }
        return all;
    }

    public count(): number {
        return this.cache.getCount();
    }

    public async bulkPut(dtos: StationObservationEnvironmentDto[], userId: number) {
        const entities: Partial<StationObservationEnvironmentEntity>[] = [];
        for (const dto of dtos) {
            const entity: StationObservationEnvironmentEntity = await this.stationObsEnvRepo.create({
                id: dto.id,
                name: dto.name,
                description: dto.description,
                entryUserId: userId
            });
            entities.push(entity);
        }

        const batchSize = 1000;
        for (let i = 0; i < entities.length; i += batchSize) {
            const batch = entities.slice(i, i + batchSize);
            await this.insertOrUpdateValues(batch);
        }

        await this.cache.invalidate();
    }

    private async insertOrUpdateValues(entities: Partial<StationObservationEnvironmentEntity>[]): Promise<void> {
        await this.stationObsEnvRepo
            .createQueryBuilder()
            .insert()
            .into(StationObservationEnvironmentEntity)
            .values(entities)
            .orUpdate(
                [
                    "name",
                    "description",
                    "entry_user_id"
                ],
                ["id"],
                {
                    skipUpdateIfNoValuesChanged: true,
                }
            )
            .execute();
    }

    public checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): MetadataUpdatesDto {
        return this.cache.checkUpdates(updatesQueryDto);
    }

}
