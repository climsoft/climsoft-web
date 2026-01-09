import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FindManyOptions, FindOptionsWhere, In, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ViewSourceDto } from '../dtos/view-source.dto';
import { CreateSourceDto } from '../dtos/create-source.dto';
import { SourceTypeEnum } from 'src/metadata/source-specifications/enums/source-type.enum';
import { SourceSpecificationEntity } from '../entities/source-specification.entity';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SourceSpecificationsService {

    constructor(
        @InjectRepository(SourceSpecificationEntity) private sourceRepo: Repository<SourceSpecificationEntity>,
        private eventEmitter: EventEmitter2,
    ) { }


    public async find(id: number): Promise<ViewSourceDto> {
        return this.createViewDto(await this.findEntity(id));
    }

    public async findAll(selectOptions?: FindOptionsWhere<SourceSpecificationEntity>): Promise<ViewSourceDto[]> {
        const findOptions: FindManyOptions<SourceSpecificationEntity> = {
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
        const findOptionsWhere: FindOptionsWhere<SourceSpecificationEntity> = {
            id: In(ids)
        };
        return this.findAll(findOptionsWhere);
    }

    public async findSourcesByType(sourceType: SourceTypeEnum): Promise<ViewSourceDto[]> {
        const findOptionsWhere: FindOptionsWhere<SourceSpecificationEntity> = {
            sourceType: sourceType
        };
        return this.findAll(findOptionsWhere);
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

    public async create(dto: CreateSourceDto, userId: number): Promise<ViewSourceDto> {
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
        entity.sampleImage = dto.sampleImage ? dto.sampleImage : null;
        entity.disabled = dto.disabled ? true : false;
        entity.comment = dto.comment ? dto.comment : null;
        entity.entryUserId = userId;

        await this.sourceRepo.save(entity);

        const viewDto: ViewSourceDto = this.createViewDto(entity);

        this.eventEmitter.emit('source.created', { id: entity.id, viewDto });

        return viewDto;

    }

    public async update(id: number, dto: CreateSourceDto, userId: number): Promise<ViewSourceDto> {
        const entity = await this.findEntity(id);
        entity.name = dto.name;
        entity.description = dto.description;
        entity.sourceType = dto.sourceType;
        entity.parameters = dto.parameters;
        entity.utcOffset = dto.utcOffset;
        entity.allowMissingValue = dto.allowMissingValue ? true : false;
        entity.scaleValues = dto.scaleValues ? true : false;
        entity.sampleImage = dto.sampleImage ? dto.sampleImage : null;
        entity.disabled = dto.disabled ? true : false;
        entity.comment = dto.comment ? dto.comment : null;
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
        const entities: SourceSpecificationEntity[] = await this.sourceRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.sourceRepo.remove(entities);
        this.eventEmitter.emit('source.deleted', {});
        return true;
    }

    private createViewDto(entity: SourceSpecificationEntity): ViewSourceDto {
        const dto: ViewSourceDto = {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            sourceType: entity.sourceType,
            utcOffset: entity.utcOffset,
            allowMissingValue: entity.allowMissingValue,
            sampleImage: entity.sampleImage?  entity.sampleImage: '' ,
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
            const whereOptions: FindOptionsWhere<SourceSpecificationEntity> = {};

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
