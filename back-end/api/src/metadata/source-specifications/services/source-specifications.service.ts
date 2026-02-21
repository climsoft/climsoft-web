import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ViewSourceSpecificationDto } from '../dtos/view-source-specification.dto';
import { CreateSourceSpecificationDto } from '../dtos/create-source-specification.dto';
import { SourceTypeEnum } from 'src/metadata/source-specifications/enums/source-type.enum';
import { SourceSpecificationEntity } from '../entities/source-specification.entity';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';
import { AppConfig } from 'src/app.config';

@Injectable()
export class SourceSpecificationsService implements OnModuleInit {
    private readonly cache: MetadataCache<ViewSourceSpecificationDto>;

    constructor(
        @InjectRepository(SourceSpecificationEntity) private sourceRepo: Repository<SourceSpecificationEntity>,
        private eventEmitter: EventEmitter2,
    ) {
        this.cache = new MetadataCache<ViewSourceSpecificationDto>(
            'SourceSpecifications',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<ViewSourceSpecificationDto>> {
        const entities = await this.sourceRepo.find({ order: { id: "ASC" } });
        const records = entities.map(entity => this.createViewDto(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public find(id: number): ViewSourceSpecificationDto {
        const dto = this.cache.getById(id);
        if (!dto) {
            throw new NotFoundException(`Source #${id} not found`);
        }
        return dto;
    }

    public findAll(): ViewSourceSpecificationDto[] {
        return this.cache.getAll();
    }

    public findSourcesByIds(ids: number[]): ViewSourceSpecificationDto[] {
        const idSet = new Set(ids);
        return this.cache.getAll().filter(dto => idSet.has(dto.id));
    }

    public findSourcesByType(sourceType: SourceTypeEnum): ViewSourceSpecificationDto[] {
        return this.cache.getAll().filter(dto => dto.sourceType === sourceType);
    }

    public async create(dto: CreateSourceSpecificationDto, userId: number): Promise<ViewSourceSpecificationDto> {
        // Source templates are required to have unique names
        let entity = await this.sourceRepo.findOneBy({
            name: dto.name,
        });

        if (entity) {
            throw new BadRequestException(`Source specification with name ${dto.name} already exists`);
        }

        entity = this.sourceRepo.create({
            name: dto.name,
        });

        entity.description = dto.description;
        entity.sourceType = dto.sourceType;
        entity.parameters = dto.parameters;
        entity.utcOffset = dto.utcOffset;
        entity.allowMissingValue = dto.allowMissingValue ? true : false;
        entity.scaleValues = dto.scaleValues ? true : false;
        entity.sampleFileName = dto.sampleFileName ? dto.sampleFileName : null;
        entity.disabled = dto.disabled ? true : false;
        entity.comment = dto.comment ? dto.comment : null;
        entity.entryUserId = userId;

        await this.sourceRepo.save(entity);
        await this.cache.invalidate();

        const viewDto: ViewSourceSpecificationDto = this.createViewDto(entity);

        this.eventEmitter.emit('source.created', { id: entity.id, viewDto });

        return viewDto;

    }

    public async update(id: number, dto: CreateSourceSpecificationDto, userId: number): Promise<ViewSourceSpecificationDto> {
        const entity = await this.findEntity(id);
        entity.name = dto.name;
        entity.description = dto.description;
        entity.sourceType = dto.sourceType;
        entity.parameters = dto.parameters;
        entity.utcOffset = dto.utcOffset;
        entity.allowMissingValue = dto.allowMissingValue ? true : false;
        entity.scaleValues = dto.scaleValues ? true : false;
        entity.sampleFileName = dto.sampleFileName ? dto.sampleFileName : null;
        entity.disabled = dto.disabled ? true : false;
        entity.comment = dto.comment ? dto.comment : null;
        entity.entryUserId = userId;

        await this.sourceRepo.save(entity);
        await this.cache.invalidate();

        const viewDto: ViewSourceSpecificationDto = this.createViewDto(entity);

        this.eventEmitter.emit('source.updated', { id, viewDto });

        return viewDto;
    }

    public async delete(id: number): Promise<number> {
        const source = await this.findEntity(id);
        await this.sourceRepo.remove(source);
        await this.cache.invalidate();
        this.eventEmitter.emit('source.deleted', { id });
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities: SourceSpecificationEntity[] = await this.sourceRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.sourceRepo.remove(entities);
        await this.cache.invalidate();
        this.eventEmitter.emit('source.deleted', {});
        return true;
    }

    private async findEntity(id: number): Promise<SourceSpecificationEntity> {
        const entity = await this.sourceRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Source #${id} not found`);
        }
        return entity;
    }

    private createViewDto(entity: SourceSpecificationEntity): ViewSourceSpecificationDto {
        const dto: ViewSourceSpecificationDto = {
            id: entity.id,
            name: entity.name,
            description: entity.description ? entity.description : '',
            sourceType: entity.sourceType,
            utcOffset: entity.utcOffset,
            allowMissingValue: entity.allowMissingValue,
            sampleFileName: entity.sampleFileName ? entity.sampleFileName : '',
            parameters: entity.parameters,
            scaleValues: entity.scaleValues,
            disabled: entity.disabled,
            comment: entity.comment ? entity.comment : '',
        }
        return dto;
    }

    public findAllReferencedSampleFiles(): Set<string> {
        return new Set(
            this.cache.getAll()
                .map(dto => dto.sampleFileName)
                .filter((f): f is string => !!f && f !== '')
        );
    }

    public checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): MetadataUpdatesDto {
        return this.cache.checkUpdates(updatesQueryDto);
    }

}
