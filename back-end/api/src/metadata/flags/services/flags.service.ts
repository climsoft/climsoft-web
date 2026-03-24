import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { ViewFlagDto } from '../dtos/view-flag.dto';
import { CreateUpdateFlagDto } from '../dtos/create-update-flag.dto';
import { FlagEntity } from '../entities/flag.entity';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';

@Injectable()
export class FlagsService implements OnModuleInit {
    private readonly cache: MetadataCache<ViewFlagDto>;

    constructor(
        @InjectRepository(FlagEntity) private flagsRepo: Repository<FlagEntity>,
    ) {
        this.cache = new MetadataCache<ViewFlagDto>(
            'Flags',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<ViewFlagDto>> {
        const entities = await this.flagsRepo.find({ order: { id: "ASC" } });
        const records = entities.map(entity => this.createViewDto(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public findOne(id: number): ViewFlagDto {
        const dto = this.cache.getById(id);
        if (!dto) {
            throw new NotFoundException(`Flag #${id} not found`);
        }
        return dto;
    }

    public find(): ViewFlagDto[] {
        return this.cache.getAll();
    }

    public count(): number {
        return this.cache.getCount();
    }

    public findMissingFlag(): ViewFlagDto {
        const flag = this.cache.getAll().find(f => f.name.toLowerCase() === 'missing');
        if (!flag) {
            throw new NotFoundException('Missing flag not found');
        }
        return flag;
    }

    private async findEntity(id: number): Promise<FlagEntity> {
        const entity = await this.flagsRepo.findOneBy({ id });
        if (!entity) {
            throw new NotFoundException(`Flag #${id} not found`);
        }
        return entity;
    }

    public async add(createDto: CreateUpdateFlagDto, userId: number): Promise<ViewFlagDto> {
        let entity: FlagEntity | null = await this.flagsRepo.findOneBy({
            abbreviation: createDto.abbreviation,
        });

        if (entity) {
            throw new NotFoundException(`Flag with abbreviation ${createDto.abbreviation} exists`);
        }

        entity = this.flagsRepo.create({
            abbreviation: createDto.abbreviation,
        });

        this.updateEntity(entity, createDto, userId);

        await this.flagsRepo.save(entity);
        await this.cache.invalidate();

        return this.findOne(entity.id);
    }

    public async update(id: number, updateDto: CreateUpdateFlagDto, userId: number): Promise<ViewFlagDto> {
        const entity: FlagEntity = await this.findEntity(id);
        this.updateEntity(entity, updateDto, userId);
        await this.flagsRepo.save(entity);
        await this.cache.invalidate();
        return this.createViewDto(entity);
    }

    public async delete(id: number): Promise<number> {
        await this.flagsRepo.remove(await this.findEntity(id));
        await this.cache.invalidate();
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities: FlagEntity[] = await this.flagsRepo.find();
        await this.flagsRepo.remove(entities);
        await this.cache.invalidate();
        return true;
    }

    public async bulkPut(dtos: ViewFlagDto[], userId: number): Promise<void> {
        const entities: FlagEntity[] = [];
        for (const dto of dtos) {
            const entity = this.flagsRepo.create({ id: dto.id });
            this.updateEntity(entity, dto, userId);
            entities.push(entity);
        }

        await this.flagsRepo
            .createQueryBuilder()
            .insert()
            .into(FlagEntity)
            .values(entities)
            .orUpdate(
                ["abbreviation", "name", "description", "comment", "entry_user_id"],
                ["id"],
                { skipUpdateIfNoValuesChanged: true }
            )
            .execute();

        await this.cache.invalidate();
    }

    private updateEntity(entity: FlagEntity, dto: CreateUpdateFlagDto, userId: number): void {
        entity.abbreviation = dto.abbreviation;
        entity.name = dto.name;
        entity.description = dto.description || null;
        entity.comment = dto.comment || null;
        entity.entryUserId = userId;
    }

    private createViewDto(entity: FlagEntity): ViewFlagDto {
        return {
            id: entity.id,
            abbreviation: entity.abbreviation,
            name: entity.name,
            description: entity.description,
            comment: entity.comment,
        };
    }

    public checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): MetadataUpdatesDto {
        return this.cache.checkUpdates(updatesQueryDto);
    }
}
