import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ViewSourceSpecificationModel } from '../dtos/view-source-specification.model';
import { CreateSourceSpecificationDto, SourceParameters } from '../dtos/create-source-specification.dto';
import { SourceTypeEnum } from 'src/metadata/source-specifications/enums/source-type.enum';
import { SourceSpecificationEntity } from '../entities/source-specification.entity';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';
import { FileIOService } from 'src/shared/services/file-io.service';

@Injectable()
export class SourceSpecificationsService implements OnModuleInit {
    private readonly logger = new Logger(SourceSpecificationsService.name);
    private readonly cache: MetadataCache<ViewSourceSpecificationModel>;

    constructor(
        @InjectRepository(SourceSpecificationEntity) private sourceRepo: Repository<SourceSpecificationEntity>,
        private eventEmitter: EventEmitter2,
        private fileIOService: FileIOService,
    ) {
        this.cache = new MetadataCache<ViewSourceSpecificationModel>(
            'SourceSpecifications',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<ViewSourceSpecificationModel>> {
        const entities = await this.sourceRepo.find({ order: { id: "ASC" } });
        const records = entities.map(entity => this.createViewDto(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public find(id: number): ViewSourceSpecificationModel {
        const dto = this.cache.getById(id);
        if (!dto) {
            throw new NotFoundException(`Source #${id} not found`);
        }
        return dto;
    }

    public findAll(): ViewSourceSpecificationModel[] {
        return this.cache.getAll();
    }

    public findSourcesByIds(ids: number[]): ViewSourceSpecificationModel[] {
        const idSet = new Set(ids);
        return this.cache.getAll().filter(dto => idSet.has(dto.id));
    }

    public findSourcesByType(sourceType: SourceTypeEnum): ViewSourceSpecificationModel[] {
        return this.cache.getAll().filter(dto => dto.sourceType === sourceType);
    }

    public async create(dto: CreateSourceSpecificationDto, userId: number): Promise<ViewSourceSpecificationModel> {
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

        await this.updateEntityFromDto(entity, dto, userId);
        await this.sourceRepo.save(entity);
        await this.cache.invalidate();

        const viewDto: ViewSourceSpecificationModel = this.createViewDto(entity);

        this.eventEmitter.emit('source.created', { id: entity.id, viewDto });

        return viewDto;

    }

    public async update(id: number, dto: CreateSourceSpecificationDto, userId: number): Promise<ViewSourceSpecificationModel> {
        const entity: SourceSpecificationEntity = await this.findEntity(id);

        await this.updateEntityFromDto(entity, dto, userId);
        await this.sourceRepo.save(entity);
        await this.cache.invalidate();

        const viewDto: ViewSourceSpecificationModel = this.createViewDto(entity);

        this.eventEmitter.emit('source.updated', { id, viewDto });

        return viewDto;
    }

    private async updateEntityFromDto(entity: SourceSpecificationEntity, dto: CreateSourceSpecificationDto, userId: number): Promise<void> {
        entity.name = dto.name;
        entity.description = dto.description;
        entity.sourceType = dto.sourceType;
        entity.parameters = dto.parameters;
        entity.utcOffset = dto.utcOffset;
        entity.allowMissingValue = dto.allowMissingValue;
        entity.scaleValues = dto.scaleValues;

        // Copy the sample file from the operation's input directory to the persistent samples directory.
        entity.sampleFileName = await this.persistSampleFile(entity.sampleFileName, dto.sampleFileOperationId);

        entity.disabled = dto.disabled;
        entity.comment = dto.comment;
        entity.adapterId = dto.adapterId;
        entity.entryUserId = userId;
    }

    /**
     * Copies the sample file from the operation's input directory(`/app/operations/uuid/input`) to the
     * persistent samples directory(`/app/samples/`). 
     * Returns the new filename, or null if no sample file was provided, or previous file name if no sample file was provided.
     */
    private async persistSampleFile(previousSampleFileName: string | null, sampleFileOperationId: string | null): Promise<string | null> {
        if (!sampleFileOperationId) {
            this.logger.warn('No file preview operation detected. Same sample file retained.');
            return previousSampleFileName;
        }

        const op = this.fileIOService.getOperationContext(sampleFileOperationId as crypto.UUID);
        const inputFiles: string[] = await fs.promises.readdir(op.inputDir);
        if (inputFiles.length === 0) {
            throw new NotFoundException(`Sample file not found`);
        }

        const sampleFileName: string = path.basename(inputFiles[0]);

        if (previousSampleFileName === sampleFileName) {
            this.logger.warn('Sample file not changed. Same sample file retained.');
            return previousSampleFileName;
        }

        const sourcePath = path.posix.join(op.inputDir, sampleFileName);
        const destPath = path.posix.join(this.fileIOService.apiSamplesDir, sampleFileName);
        try {
            this.logger.log(`Copying new sample file '${sampleFileName}' to dir: ${destPath}`);
            await fs.promises.copyFile(sourcePath, destPath);
        } catch (err) {
            this.logger.warn(`Could not copy sample file '${sampleFileName}' to samples dir: ${(err as Error).message}`);
        }

        return sampleFileName;
    }

    /**
     * Bulk-update only the `parameters` JSON of multiple sources in one round-trip.
     * Persists all rows, invalidates the cache once, and emits a single
     * `source.bulk-updated` event for the whole batch.
     *
     * Intended for data migrations and other administrative bulk operations
     * where firing per-row `source.updated` events would be wasteful.
     */
    public async bulkUpdateParameters(
        updates: { id: number; parameters: SourceParameters }[],
        userId: number,
    ): Promise<number> {
        if (updates.length === 0) return 0;

        const ids = updates.map(u => u.id);
        const entities = await this.sourceRepo.find({ where: { id: In(ids) } });
        const byId = new Map(entities.map(e => [e.id, e]));

        const toSave: SourceSpecificationEntity[] = [];
        for (const { id, parameters } of updates) {
            const entity = byId.get(id);
            if (!entity) continue;
            entity.parameters = parameters;
            entity.entryUserId = userId;
            toSave.push(entity);
        }

        if (toSave.length === 0) return 0;

        await this.sourceRepo.save(toSave);
        await this.cache.invalidate();
        this.eventEmitter.emit('source.bulk-updated', { ids: toSave.map(e => e.id) });

        return toSave.length;
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

    private createViewDto(entity: SourceSpecificationEntity): ViewSourceSpecificationModel {
        const dto: ViewSourceSpecificationModel = {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            sourceType: entity.sourceType,
            utcOffset: entity.utcOffset,
            allowMissingValue: entity.allowMissingValue,
            sampleFileName: entity.sampleFileName,
            parameters: entity.parameters,
            scaleValues: entity.scaleValues,
            adapterId: entity.adapterId ?? null,
            disabled: entity.disabled,
            comment: entity.comment,
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
