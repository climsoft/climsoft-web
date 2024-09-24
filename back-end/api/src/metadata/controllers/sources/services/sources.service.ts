import { Injectable, NotFoundException } from '@nestjs/common';
import { FindManyOptions, FindOptionsWhere, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SourceEntity } from '../../../sources/entities/source.entity';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import { ViewSourceDto } from 'src/metadata/sources/dtos/view-source.dto';
import { SourceTypeEnum } from 'src/metadata/sources/enums/source-type.enum';
import { CreateUpdateSourceDto } from 'src/metadata/sources/dtos/create-update-source.dto';
import { CreateEntryFormDTO } from 'src/metadata/sources/dtos/create-entry-form.dto';
import { ViewElementDto } from 'src/metadata/elements/dtos/elements/view-element.dto';
import { ViewEntryFormDTO } from 'src/metadata/sources/dtos/view-entry-form.dto';

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
        const dtos: ViewSourceDto[] = []
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

    public async create(dto: CreateUpdateSourceDto): Promise<ViewSourceDto> {
        //source entity will be created with an auto incremented id
        const entity = this.sourceRepo.create({
            name: dto.name,
            description: dto.description,
            sourceType: dto.sourceType,
            utcOffset: dto.utcOffset,
            allowMissingValue: dto.allowMissingValue,
            sampleImage: dto.sampleImage,
            parameters: dto.parameters
        });

        await this.sourceRepo.save(entity);

        return this.createViewDto(entity);

    }

    public async update(id: number, dto: CreateUpdateSourceDto) {
        const source = await this.findEntity(id);
        source.name = dto.name;
        source.description = dto.description;
        source.sourceType = dto.sourceType;
        source.utcOffset = dto.utcOffset;
        source.allowMissingValue = dto.allowMissingValue;
        source.sampleImage = dto.sampleImage;
        source.parameters = dto.parameters;

        // TODO. Later Implement logging of changes in the database.
        return this.sourceRepo.save(source);
    }

    public async delete(id: number): Promise<number> {
        const source = await this.findEntity(id);
        await this.sourceRepo.remove(source);
        return id;
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
        }

        if (dto.sourceType == SourceTypeEnum.FORM) {
            const createEntryFormDTO: CreateEntryFormDTO = dto.parameters as CreateEntryFormDTO
            const elementsMetadata: ViewElementDto[] = await this.elementsService.findSome(createEntryFormDTO.elementIds);
            const viewEntryForm: ViewEntryFormDTO = { ...createEntryFormDTO, elementsMetadata, isValid: () => true }
            dto.parameters = viewEntryForm;
        }

        return dto;
    }

}
