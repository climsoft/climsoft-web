import { Injectable, NotFoundException } from '@nestjs/common';
import { FindManyOptions, FindOptionsWhere, In, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ViewSourceDto } from '../dtos/view-source.dto'; 
import { CreateUpdateSourceDto } from '../dtos/create-update-source.dto';
import { SourceTypeEnum } from 'src/metadata/sources/enums/source-type.enum'; 
import { CreateEntryFormDTO } from '../dtos/create-entry-form.dto';
import { ViewEntryFormDTO } from '../dtos/view-entry-form.dto';
import { SourceEntity } from '../entities/source.entity';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/elements/create-view-element.dto';

// TODO refactor this service later

@Injectable()
export class SourcesService {

    constructor(
        @InjectRepository(SourceEntity) private readonly sourceRepo: Repository<SourceEntity>,
        private elementsService: ElementsService
    ) { }


    public async find(id: number): Promise<ViewSourceDto> {
        return this.createViewDto(await this.findEntity(id));
    }

    public async findAll(selectOptions?: FindOptionsWhere<SourceEntity>): Promise<ViewSourceDto[]> {
        const findOptions: FindManyOptions<SourceEntity> = {
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
        const findOptionsWhere: FindOptionsWhere<SourceEntity> = {
            id: In(ids)
        };
        return this.findAll(findOptionsWhere);
    }

    public async findSourcesByType(sourceType: SourceTypeEnum): Promise<ViewSourceDto[]> {
        const findOptionsWhere: FindOptionsWhere<SourceEntity> = {
            sourceType: sourceType
        };
        return this.findAll(findOptionsWhere);
    }

    private async findEntity(id: number): Promise<SourceEntity> {
        const entity = await this.sourceRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Source #${id} not found`);
        }
        return entity;
    }

    public async put(dto: CreateUpdateSourceDto, userId: number): Promise<ViewSourceDto> {
        //source entity will be created with an auto incremented id
        const entity = this.sourceRepo.create({
            name: dto.name,
            description: dto.description,
            sourceType: dto.sourceType,
            utcOffset: dto.utcOffset,
            allowMissingValue: dto.allowMissingValue,
            scaleValues: dto.scaleValues,
            sampleImage: dto.sampleImage,
            parameters: dto.parameters,
            entryUserId: userId
        });

        await this.sourceRepo.save(entity);

        return this.createViewDto(entity);

    }

    public async update(id: number, dto: CreateUpdateSourceDto, userId: number) {
        const source = await this.findEntity(id);
        source.name = dto.name;
        source.description = dto.description;
        source.sourceType = dto.sourceType;
        source.utcOffset = dto.utcOffset;
        source.allowMissingValue = dto.allowMissingValue;
        source.sampleImage = dto.sampleImage;
        source.parameters = dto.parameters;
        source.entryUserId = userId;

        // TODO. Later Implement logging of changes in the database.
        return this.sourceRepo.save(source);
    }

    public async delete(id: number): Promise<number> {
        const source = await this.findEntity(id);
        await this.sourceRepo.remove(source);
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities: SourceEntity[] = await this.sourceRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.sourceRepo.remove(entities);
        return true;
    }

    private async createViewDto(entity: SourceEntity): Promise<ViewSourceDto> {
        const dto: ViewSourceDto = {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            sourceType: entity.sourceType,
            utcOffset: entity.utcOffset,
            allowMissingValue: entity.allowMissingValue,
            sampleImage: entity.sampleImage,
            parameters: entity.parameters,
            scaleValues: entity.scaleValues
        }

        if (dto.sourceType == SourceTypeEnum.FORM) {
            const createEntryFormDTO: CreateEntryFormDTO = dto.parameters as CreateEntryFormDTO
            const elementsMetadata: CreateViewElementDto[] = await this.elementsService.find({elementIds: createEntryFormDTO.elementIds});
            const viewEntryForm: ViewEntryFormDTO = { ...createEntryFormDTO, elementsMetadata, isValid: () => true }
            dto.parameters = viewEntryForm;
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
            const whereOptions: FindOptionsWhere<SourceEntity> = {};

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
