import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FindManyOptions, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ViewSpecificationExportDto } from '../dtos/view-export-specification.dto';
import { ExportSpecificationEntity } from '../entities/export-specification.entity';
import { CreateExportSpecificationDto } from '../dtos/create-export-specification.dto';

@Injectable()
export class ExportSpecificationsService {

    constructor(
        @InjectRepository(ExportSpecificationEntity) private exportsRepo: Repository<ExportSpecificationEntity>,
    ) { }


    public async find(id: number): Promise<ViewSpecificationExportDto> {
        return this.createViewDto(await this.findEntity(id));
    }

    public async findAll(ids?: number[]): Promise<ViewSpecificationExportDto[]> {
        const findOptions: FindManyOptions<ExportSpecificationEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (ids && ids.length > 0) {
            findOptions.where = {
                id: In(ids)
            };
        }

        const sourceEntities = await this.exportsRepo.find(findOptions);
        const dtos: ViewSpecificationExportDto[] = [];
        for (const entity of sourceEntities) {
            dtos.push(this.createViewDto(entity));
        }
        return dtos;
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

        console.log('Creating export specification entity: ', dto);

        await this.exportsRepo.save(entity);

        return this.createViewDto(entity);

    }

    public async update(id: number, dto: CreateExportSpecificationDto, userId: number) {
        const entity = await this.findEntity(id);
        entity.name = dto.name;
        entity.description = dto.description; 
        entity.exportType = dto.exportType; 
        entity.parameters = dto.parameters;
        entity.comment = dto.comment ? dto.comment : null;
        entity.entryUserId = userId;

        // TODO. Later Implement logging of changes in the database.
        return this.exportsRepo.save(entity);
    }

    public async delete(id: number): Promise<number> {
        const source = await this.findEntity(id);
        await this.exportsRepo.remove(source);
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities: ExportSpecificationEntity[] = await this.exportsRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.exportsRepo.remove(entities);
        return true;
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
