import { Repository } from "typeorm";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MetadataUpdatesQueryDto } from "src/metadata/metadata-updates/dtos/metadata-updates-query.dto";
import { MetadataUpdatesDto } from "src/metadata/metadata-updates/dtos/metadata-updates.dto";
import { ElementSubdomainEntity } from "../entities/element-subdomain.entity";
import { ViewElementSubdomainDto } from "../dtos/elements/view-element-subdomain.dto";
import { CacheLoadResult, MetadataCache } from "src/shared/cache/metadata-cache";

@Injectable()
export class ElementSubdomainsService implements OnModuleInit {
    private readonly cache: MetadataCache<ViewElementSubdomainDto>;

    public constructor(
        @InjectRepository(ElementSubdomainEntity) private elementSubdomainRepo: Repository<ElementSubdomainEntity>) {
        this.cache = new MetadataCache<ViewElementSubdomainDto>(
            'ElementSubdomains',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<ViewElementSubdomainDto>> {
        const entities = await this.elementSubdomainRepo.find({ order: { id: "ASC" } });
        const records = entities.map(item => ({
            id: item.id, name: item.name, description: item.description, domain: item.domain
        }));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public find(): ViewElementSubdomainDto[] {
        return this.cache.getAll();
    }

    public count(): number {
        return this.cache.getCount();
    }

    public async bulkPut(dtos: ViewElementSubdomainDto[], userId: number) {
        const entities: Partial<ElementSubdomainEntity>[] = [];
        for (const dto of dtos) {
            const entity: ElementSubdomainEntity = await this.elementSubdomainRepo.create({
                id: dto.id,
                name: dto.name,
                description: dto.description,
                domain: dto.domain,
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

    private async insertOrUpdateValues(entities: Partial<ElementSubdomainEntity>[]): Promise<void> {
        await this.elementSubdomainRepo
            .createQueryBuilder()
            .insert()
            .into(ElementSubdomainEntity)
            .values(entities)
            .orUpdate(
                [
                    "name",
                    "description",
                    "domain",
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
