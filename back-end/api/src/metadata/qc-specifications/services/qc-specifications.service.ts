import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { QCSpecificationEntity } from '../entities/qc-specification.entity';
import { QCTestTypeEnum } from '../entities/qc-test-type.enum';
import { CreateQCSpecificationDto } from '../dtos/create-qc-specification.dto';
import { FindQCSpecificationQueryDto } from '../dtos/find-qc-specification-query.dto';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { ViewQCSpecificationDto } from '../dtos/view-qc-specification.dto';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';

@Injectable()
export class QCSpecificationsService implements OnModuleInit {
    private readonly cache: MetadataCache<ViewQCSpecificationDto>;

    constructor(@InjectRepository(QCSpecificationEntity) private readonly qcTestsRepo: Repository<QCSpecificationEntity>) {
        this.cache = new MetadataCache<ViewQCSpecificationDto>(
            'QCSpecifications',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<ViewQCSpecificationDto>> {
        const entities = await this.qcTestsRepo.find({ order: { id: "ASC" } });
        const records = entities.map(entity => this.createViewDto(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    public find(findQCQuery?: FindQCSpecificationQueryDto): ViewQCSpecificationDto[] {
        let results = this.cache.getAll();

        if (findQCQuery) {
            if (findQCQuery.observationInterval !== undefined) {
                results = results.filter(dto => dto.observationInterval === findQCQuery.observationInterval);
            }

            if (findQCQuery.qcTestTypes && findQCQuery.qcTestTypes.length > 0) {
                const typeSet = new Set(findQCQuery.qcTestTypes);
                results = results.filter(dto => typeSet.has(dto.qcTestType));
            }

            if (findQCQuery.elementIds && findQCQuery.elementIds.length > 0) {
                const elementIdSet = new Set(findQCQuery.elementIds);
                results = results.filter(dto => elementIdSet.has(dto.elementId));
            }
        }

        return results;
    }

    public findById(id: number): ViewQCSpecificationDto {
        const dto = this.cache.getById(id);
        if (!dto) {
            throw new NotFoundException(`QC Test #${id} not found`);
        }
        return dto;
    }

    public findQCTestByType(qcTestType: QCTestTypeEnum): ViewQCSpecificationDto[] {
        return this.cache.getAll().filter(dto => dto.qcTestType === qcTestType);
    }

    public findQCTestByElement(elementId: number): ViewQCSpecificationDto[] {
        return this.cache.getAll().filter(dto => dto.elementId === elementId);
    }

    public async create(dto: CreateQCSpecificationDto, userId: number): Promise<ViewQCSpecificationDto> {
        //source entity will be created with an auto incremented id
        const entity = this.qcTestsRepo.create({
            name: dto.name,
            description: dto.description,
            elementId: dto.elementId,
            observationLevel: dto.observationLevel,
            observationInterval: dto.observationInterval,
            qcTestType: dto.qcTestType,
            parameters: dto.parameters,
            disabled: dto.disabled,
            comment: dto.comment,
            entryUserId: userId
        });

        await this.qcTestsRepo.save(entity);
        await this.cache.invalidate();

        return this.createViewDto(entity);

    }

    public async update(id: number, dto: CreateQCSpecificationDto, userId: number): Promise<ViewQCSpecificationDto> {
        const qctest = await this.findEntity(id);
        qctest.name = dto.name;
        qctest.description = dto.description ? dto.description : null;
        qctest.elementId = dto.elementId;
        qctest.observationLevel = dto.observationLevel;
        qctest.observationInterval = dto.observationInterval;
        qctest.qcTestType = dto.qcTestType;
        qctest.parameters = dto.parameters;
        qctest.disabled = dto.disabled;
        qctest.comment = dto.comment ? dto.comment : null;
        qctest.entryUserId = userId;

        await this.qcTestsRepo.save(qctest);
        await this.cache.invalidate();

        return this.createViewDto(qctest);
    }

    public async delete(id: number): Promise<number> {
        const source = await this.findEntity(id);
        await this.qcTestsRepo.remove(source);
        await this.cache.invalidate();
        return id;
    }

    public async deleteAll(): Promise<void> {
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.qcTestsRepo.remove(await this.qcTestsRepo.find());
        await this.cache.invalidate();
    }

    private async findEntity(id: number): Promise<QCSpecificationEntity> {
        const entity = await this.qcTestsRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`QC Test #${id} not found`);
        }
        return entity;
    }

    private createViewDto(entity: QCSpecificationEntity): ViewQCSpecificationDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            elementId: entity.elementId,
            observationLevel: entity.observationLevel,
            observationInterval: entity.observationInterval,
            qcTestType: entity.qcTestType,
            parameters: entity.parameters,
            disabled: entity.disabled,
            comment: entity.comment
        };
    }

    public checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): MetadataUpdatesDto {
        return this.cache.checkUpdates(updatesQueryDto);
    }

}
