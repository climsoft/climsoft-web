import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ViewSpecificationExportDto } from '../dtos/view-export-specification.dto';
import { ExportSpecificationEntity } from '../entities/export-specification.entity';
import { CreateExportSpecificationDto } from '../dtos/create-export-specification.dto';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';

@Injectable()
export class ExportSpecificationsService implements OnModuleInit {
    private readonly cache: MetadataCache<ViewSpecificationExportDto>;

    constructor(
        @InjectRepository(ExportSpecificationEntity) private exportsRepo: Repository<ExportSpecificationEntity>,
    ) {
        this.cache = new MetadataCache<ViewSpecificationExportDto>(
            'ExportSpecifications',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<ViewSpecificationExportDto>> {
        const entities = await this.exportsRepo.find({ order: { id: "ASC" } });
        const records = entities.map(entity => this.createViewDto(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public find(id: number): ViewSpecificationExportDto {
        const dto = this.cache.getById(id);
        if (!dto) {
            throw new NotFoundException(`Export #${id} not found`);
        }
        return dto;
    }

    public findAll(ids?: number[]): ViewSpecificationExportDto[] {
        if (ids && ids.length > 0) {
            const idSet = new Set(ids);
            return this.cache.getAll().filter(dto => idSet.has(dto.id));
        }
        return this.cache.getAll();
    }

    public async create(dto: CreateExportSpecificationDto, userId: number): Promise<ViewSpecificationExportDto> {
        // Export templates are required to have unique names
        let entity = await this.exportsRepo.findOneBy({
            name: dto.name,
        });

        if (entity) {
            throw new BadRequestException(`Export template with name ${dto.name} found`);
        }

        entity = this.exportsRepo.create({
            name: dto.name,
        });

        entity.description = dto.description;
        entity.exportType = dto.exportType;
        entity.parameters = dto.parameters;
        entity.disabled = dto.disabled ? true : false;
        entity.comment = dto.comment ? dto.comment : null;
        entity.entryUserId = userId;

        await this.exportsRepo.save(entity);
        await this.cache.invalidate();

        return this.createViewDto(entity);

    }

    public async update(id: number, dto: CreateExportSpecificationDto, userId: number): Promise<ViewSpecificationExportDto> {
        const entity = await this.findEntity(id);
        entity.name = dto.name;
        entity.description = dto.description;
        entity.exportType = dto.exportType;
        entity.parameters = dto.parameters;
        entity.comment = dto.comment ? dto.comment : null;
        entity.entryUserId = userId;

        await this.exportsRepo.save(entity);
        await this.cache.invalidate();

        return this.createViewDto(entity);
    }

    public async delete(id: number): Promise<number> {
        const source = await this.findEntity(id);
        await this.exportsRepo.remove(source);
        await this.cache.invalidate();
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities: ExportSpecificationEntity[] = await this.exportsRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.exportsRepo.remove(entities);
        await this.cache.invalidate();
        return true;
    }

    private async findEntity(id: number): Promise<ExportSpecificationEntity> {
        const entity = await this.exportsRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Export #${id} not found`);
        }
        return entity;
    }

    private createViewDto(entity: ExportSpecificationEntity): ViewSpecificationExportDto {
        const dto: ViewSpecificationExportDto = {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            exportType: entity.exportType,
            parameters: entity.parameters,
            disabled: entity.disabled,
            comment: entity.comment,
        }
        return dto;
    }

}
