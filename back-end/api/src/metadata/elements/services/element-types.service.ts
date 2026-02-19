import { FindManyOptions, Repository } from "typeorm";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MetadataUpdatesQueryDto } from "src/metadata/metadata-updates/dtos/metadata-updates-query.dto";
import { MetadataUpdatesDto } from "src/metadata/metadata-updates/dtos/metadata-updates.dto";
import { ElementTypeEntity } from "../entities/element-type.entity";
import { ViewElementTypeDto } from "../dtos/elements/view-element-type.dto";
import { CacheLoadResult, MetadataCache } from "src/shared/cache/metadata-cache";

@Injectable()
export class ElementTypesService implements OnModuleInit {
    private readonly cache: MetadataCache<ViewElementTypeDto>;

    public constructor(
        @InjectRepository(ElementTypeEntity) private elementTypeRepo: Repository<ElementTypeEntity>) {
        this.cache = new MetadataCache<ViewElementTypeDto>(
            'ElementTypes',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<ViewElementTypeDto>> {
        const entities = await this.elementTypeRepo.find({ order: { id: "ASC" } });
        const records = entities.map(item => ({
            id: item.id, name: item.name, description: item.description, subdomainId: item.subdomainId
        }));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public find(): ViewElementTypeDto[] {
        return this.cache.getAll();
    }

    public count(): number {
        return this.cache.getCount();
    }

    public async bulkPut(dtos: ViewElementTypeDto[], userId: number) {
        const entities: Partial<ElementTypeEntity>[] = [];
        for (const dto of dtos) {
            const entity: ElementTypeEntity = await this.elementTypeRepo.create({
                id: dto.id,
                name: dto.name,
                description: dto.description,
                subdomainId: dto.subdomainId,
                entryUserId: userId
            });
            entities.push(entity);
        }

        await this.insertOrUpdateValues(entities);
        await this.cache.invalidate();
    }

    private async insertOrUpdateValues(entities: Partial<ElementTypeEntity>[]): Promise<void> {
        await this.elementTypeRepo
            .createQueryBuilder()
            .insert()
            .into(ElementTypeEntity)
            .values(entities)
            .orUpdate(
                [
                    "name",
                    "description",
                    "subdomain_id",
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
