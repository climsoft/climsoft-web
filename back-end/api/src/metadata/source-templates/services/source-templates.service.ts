import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FindManyOptions, FindOptionsWhere, In, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ViewSourceDto } from '../dtos/view-source.dto';
import { CreateUpdateSourceDto } from '../dtos/create-update-source.dto';
import { SourceTypeEnum } from 'src/metadata/source-templates/enums/source-type.enum';
import { SourceTemplateEntity } from '../entities/source-template.entity';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SourceTemplatesService {

    constructor(
        @InjectRepository(SourceTemplateEntity) private sourceRepo: Repository<SourceTemplateEntity>,
        private eventEmitter: EventEmitter2,
    ) { }


    public async find(id: number): Promise<ViewSourceDto> {
        return this.createViewDto(await this.findEntity(id));
    }

    public async findAll(selectOptions?: FindOptionsWhere<SourceTemplateEntity>): Promise<ViewSourceDto[]> {
        const findOptions: FindManyOptions<SourceTemplateEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (selectOptions) {
            findOptions.where = selectOptions;
        }

        const sourceEntities = await this.sourceRepo.find(findOptions);
        const dtos: ViewSourceDto[] = [];
        for (const entity of sourceEntities) {
            dtos.push(await this.createViewDto(entity));
        }
        return dtos;
    }

    public async findSourcesByIds(ids: number[]): Promise<ViewSourceDto[]> {
        const findOptionsWhere: FindOptionsWhere<SourceTemplateEntity> = {
            id: In(ids)
        };
        return this.findAll(findOptionsWhere);
    }

    public async findSourcesByType(sourceType: SourceTypeEnum): Promise<ViewSourceDto[]> {
        const findOptionsWhere: FindOptionsWhere<SourceTemplateEntity> = {
            sourceType: sourceType
        };
        return this.findAll(findOptionsWhere);
    }

    private async findEntity(id: number): Promise<SourceTemplateEntity> {
        const entity = await this.sourceRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Source #${id} not found`);
        }
        return entity;
    }

    public async create(dto: CreateUpdateSourceDto, userId: number): Promise<ViewSourceDto> {
        // Source templates are required to have unique names
        let entity = await this.sourceRepo.findOneBy({
            name: dto.name,
        });

        if (entity) {
            throw new BadRequestException(`Source template with name ${dto.name} found`);
        }

        entity = this.sourceRepo.create({
            name: dto.name,
        });

        entity.description = dto.description;
        entity.sourceType = dto.sourceType;
        entity.utcOffset = dto.utcOffset;
        entity.allowMissingValue = dto.allowMissingValue;
        entity.scaleValues = dto.scaleValues;
        entity.sampleImage = dto.sampleImage;
        entity.parameters = dto.parameters;
        entity.disabled = dto.disabled ? true : false;
        entity.comment = dto.comment ? dto.comment : null;
        entity.entryUserId = userId;

        await this.sourceRepo.save(entity);

        const viewDto: ViewSourceDto = this.createViewDto(entity);

        this.eventEmitter.emit('source.created', { id: entity.id, viewDto });

        return viewDto;

    }

    public async update(id: number, dto: CreateUpdateSourceDto, userId: number): Promise<ViewSourceDto> {
        const entity = await this.findEntity(id);
        entity.name = dto.name;
        entity.description = dto.description;
        entity.sourceType = dto.sourceType;
        entity.utcOffset = dto.utcOffset;
        entity.allowMissingValue = dto.allowMissingValue;
        entity.sampleImage = dto.sampleImage;
        entity.parameters = dto.parameters;
        entity.entryUserId = userId;

        await this.sourceRepo.save(entity);

        const viewDto: ViewSourceDto = this.createViewDto(entity);

        this.eventEmitter.emit('source.updated', { id, viewDto });

        return viewDto;
    }

    public async delete(id: number): Promise<number> {
        const source = await this.findEntity(id);
        await this.sourceRepo.remove(source);
        this.eventEmitter.emit('source.deleted', { id });
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities: SourceTemplateEntity[] = await this.sourceRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.sourceRepo.remove(entities);
        this.eventEmitter.emit('source.deleted', {});
        return true;
    }

    private createViewDto(entity: SourceTemplateEntity): ViewSourceDto {
        const dto: ViewSourceDto = {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            sourceType: entity.sourceType,
            utcOffset: entity.utcOffset,
            allowMissingValue: entity.allowMissingValue,
            sampleImage: entity.sampleImage,
            parameters: entity.parameters,
            scaleValues: entity.scaleValues,
            disabled: entity.disabled,
            comment: entity.comment,
        }
        return dto;
    }

    public async checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): Promise<MetadataUpdatesDto> {
        let changesDetected: boolean = false;

        const serverCount = await this.sourceRepo.count();

        if (serverCount !== updatesQueryDto.lastModifiedCount) {
            // If number of records in server are not the same as those in the client then changes detected
            changesDetected = true;
        } else {
            const whereOptions: FindOptionsWhere<SourceTemplateEntity> = {};

            if (updatesQueryDto.lastModifiedDate) {
                whereOptions.entryDateTime = MoreThan(new Date(updatesQueryDto.lastModifiedDate));
            }

            // If there was any changed record then changes detected
            changesDetected = (await this.sourceRepo.count({ where: whereOptions })) > 0
        }

        if (changesDetected) {
            // If any changes detected then return all records 
            const allRecords = await this.findAll();
            return { metadataChanged: true, metadataRecords: allRecords }
        } else {
            // If no changes detected then indicate no metadata changed
            return { metadataChanged: false }
        }
    }

}
