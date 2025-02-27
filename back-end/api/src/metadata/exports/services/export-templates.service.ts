import { Injectable, NotFoundException } from '@nestjs/common';
import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ViewTemplateExportDto } from '../dtos/view-export-template.dto';
import { ExportTemplateEntity } from '../entities/export-template.entity';
import { CreateExportTemplateDto } from '../dtos/create-export-template.dto';

@Injectable()
export class ExportTemplatesService {

    constructor(
        @InjectRepository(ExportTemplateEntity) private exportsRepo: Repository<ExportTemplateEntity>,
    ) { }


    public async find(id: number): Promise<ViewTemplateExportDto> {
        return this.createViewDto(await this.findEntity(id));
    }

    public async findAll(selectOptions?: FindOptionsWhere<ExportTemplateEntity>): Promise<ViewTemplateExportDto[]> {
        const findOptions: FindManyOptions<ExportTemplateEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (selectOptions) {
            findOptions.where = selectOptions;
        }

        const sourceEntities = await this.exportsRepo.find(findOptions);
        const dtos: ViewTemplateExportDto[] = [];
        for (const entity of sourceEntities) {
            dtos.push(this.createViewDto(entity));
        }
        return dtos;
    }

    private async findEntity(id: number): Promise<ExportTemplateEntity> {
        const entity = await this.exportsRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Export #${id} not found`);
        }
        return entity;
    }

    public async put(dto: CreateExportTemplateDto, userId: number): Promise<ViewTemplateExportDto> {
        // sources are required to have unique names
        let entity = await this.exportsRepo.findOneBy({
            name: dto.name,
        });

        if (!entity) {
            entity = this.exportsRepo.create({
                name: dto.name,
            });
        }

        entity.description = dto.description;
        entity.utcOffset = dto.utcOffset;
        entity.parameters = dto.parameters;
        entity.disabled = dto.disabled ? true : false;
        entity.comment = dto.comment ? dto.comment : null;
        entity.entryUserId = userId;

        await this.exportsRepo.save(entity);

        return this.createViewDto(entity);

    }

    public async update(id: number, dto: CreateExportTemplateDto, userId: number) {
        const source = await this.findEntity(id);
        source.name = dto.name;
        source.description = dto.description;
        source.utcOffset = dto.utcOffset;
        source.parameters = dto.parameters;
        source.entryUserId = userId;

        // TODO. Later Implement logging of changes in the database.
        return this.exportsRepo.save(source);
    }

    public async delete(id: number): Promise<number> {
        const source = await this.findEntity(id);
        await this.exportsRepo.remove(source);
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities: ExportTemplateEntity[] = await this.exportsRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.exportsRepo.remove(entities);
        return true;
    }

    private createViewDto(entity: ExportTemplateEntity): ViewTemplateExportDto {
        const dto: ViewTemplateExportDto = {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            parameters: entity.parameters,
            utcOffset: entity.utcOffset,
            disabled: entity.disabled,
            comment: entity.comment,
        }
        return dto;
    }

}
