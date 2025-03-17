import { Injectable, NotFoundException } from '@nestjs/common';
import { FindManyOptions, FindOptionsWhere, In, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm'; 
import { ViewRegionQueryDTO } from '../../regions/dtos/view-region-query.dto';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto'; 
import { ViewOrganisationDto } from '../../organisations/dtos/view-organisation.dto';
import { ViewOrganisationQueryDTO } from '../../organisations/dtos/view-organisation-query.dto';
import { CreateUpdateOrganisationDto } from '../../organisations/dtos/create-update-organisation.dto';
import { OrganisationEntity } from '../entities/organisation.entity'; 

@Injectable()
export class OrganisationsService {

    constructor(
        @InjectRepository(OrganisationEntity) private organisationsRepo: Repository<OrganisationEntity>, 
    ) { }

    private async findEntity(id: number): Promise<OrganisationEntity> {
        const entity = await this.organisationsRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Organisation #${id} not found`);
        }
        return entity;
    }

    public async findOne(id: number): Promise<ViewOrganisationDto> {
        const entity = await this.findEntity(id);
        return this.createViewDto(entity);
    }

    public async find(queryDto?: ViewOrganisationQueryDTO): Promise<ViewOrganisationDto[]> {
        const findOptions: FindManyOptions<OrganisationEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (queryDto) {
            findOptions.where = this.getFilter(queryDto);
            // If page and page size provided, skip and limit accordingly
            if (queryDto.page && queryDto.page > 0 && queryDto.pageSize) {
                findOptions.skip = (queryDto.page - 1) * queryDto.pageSize;
                findOptions.take = queryDto.pageSize;
            }
        }

        return (await this.organisationsRepo.find(findOptions)).map(entity => {
            return this.createViewDto(entity);
        });
    }

    public async count(viewRegionQueryDto: ViewOrganisationQueryDTO): Promise<number> {
        return this.organisationsRepo.countBy(this.getFilter(viewRegionQueryDto));
    }

    private getFilter(queryDto: ViewOrganisationQueryDTO): FindOptionsWhere<OrganisationEntity> {
        const whereOptions: FindOptionsWhere<OrganisationEntity> = {};

        if (queryDto.organisationIds) {
            whereOptions.id = queryDto.organisationIds.length === 1 ? queryDto.organisationIds[0] : In(queryDto.organisationIds);
        }

        return whereOptions
    }

    public async add(createDto: CreateUpdateOrganisationDto, userId: number): Promise<ViewOrganisationDto> {
        let entity: OrganisationEntity | null = await this.organisationsRepo.findOneBy({
            name: createDto.name,
        });

        if (entity) {
            throw new NotFoundException(`Organisation with name ${createDto.name} exists`);
        }

        entity = this.organisationsRepo.create({
            name: createDto.name,
        });

        this.updateEntity(entity, createDto, userId);

        await this.organisationsRepo.save(entity);

        // Important. Retrieve the entity with updated properties like  name before creating the view
        return this.findOne(entity.id);

    }

    public async update(id: number, updateDto: CreateUpdateOrganisationDto, userId: number): Promise<ViewOrganisationDto> {
        const entity: OrganisationEntity = await this.findEntity(id);

        this.updateEntity(entity, updateDto, userId);

        await this.organisationsRepo.save(entity);

        return this.createViewDto(entity);
    }

    public async delete(id: number): Promise<number> {
        await this.organisationsRepo.remove(await this.findEntity(id));
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities: OrganisationEntity[] = await this.organisationsRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.organisationsRepo.remove(entities);
        return true;
    }

    private updateEntity(entity: OrganisationEntity, dto: CreateUpdateOrganisationDto, userId: number): void {
        entity.name = dto.name;
        entity.description = dto.description ? dto.description : null;
        entity.extraMetadata = dto.extraMetadata? dto.extraMetadata: null ; 
        entity.comment = dto.comment ? dto.comment : null; 
        entity.entryUserId = userId;
    }

    private createViewDto(entity: OrganisationEntity): ViewOrganisationDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            extraMetadata: entity.extraMetadata,
            comment: entity.comment,
        };
    }

    public async checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): Promise<MetadataUpdatesDto> {
        let changesDetected: boolean = false;

        const serverCount = await this.organisationsRepo.count();

        if (serverCount !== updatesQueryDto.lastModifiedCount) {
            // If number of records in server are not the same as those in the client then changes detected
            changesDetected = true;
        } else {
            const whereOptions: FindOptionsWhere<OrganisationEntity> = {};

            if (updatesQueryDto.lastModifiedDate) {
                whereOptions.entryDateTime = MoreThan(new Date(updatesQueryDto.lastModifiedDate));
            }

            // If there was any changed record then changes detected
            changesDetected = (await this.organisationsRepo.count({ where: whereOptions })) > 0
        }

        if (changesDetected) {
            // If any changes detected then return all records 
            const allRecords = await this.find();
            return { metadataChanged: true, metadataRecords: allRecords }
        } else {
            // If no changes detected then indicate no metadata changed
            return { metadataChanged: false }
        }
    }

}
