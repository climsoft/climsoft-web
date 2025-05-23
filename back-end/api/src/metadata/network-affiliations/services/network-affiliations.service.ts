import { Injectable, NotFoundException } from '@nestjs/common';
import { FindManyOptions, FindOptionsWhere, In, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm'; 
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';  
import { NetworkAffiliationEntity } from '../entities/network-affiliation.entity';
import { ViewNetworkAffiliationDto } from '../dtos/view-network-affiliation.dto';
import { ViewNetworkAffiliationQueryDTO } from '../dtos/view-network-affiliation-query.dto';
import { CreateUpdateNetworkAffiliationDto } from '../dtos/create-update-network-affiliation.dto';

@Injectable()
export class NetworkAffiliationsService {

    constructor(
        @InjectRepository(NetworkAffiliationEntity) private networkAffiliationsRepo: Repository<NetworkAffiliationEntity>, 
    ) { }

    private async findEntity(id: number): Promise<NetworkAffiliationEntity> {
        const entity = await this.networkAffiliationsRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Network affiliation #${id} not found`);
        }
        return entity;
    }

    public async findOne(id: number): Promise<ViewNetworkAffiliationDto> {
        const entity = await this.findEntity(id);
        return this.createViewDto(entity);
    }

    public async find(queryDto?: ViewNetworkAffiliationQueryDTO): Promise<ViewNetworkAffiliationDto[]> {
        const findOptions: FindManyOptions<NetworkAffiliationEntity> = {
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

        return (await this.networkAffiliationsRepo.find(findOptions)).map(entity => {
            return this.createViewDto(entity);
        });
    }

    public async count(viewRegionQueryDto: ViewNetworkAffiliationQueryDTO): Promise<number> {
        return this.networkAffiliationsRepo.countBy(this.getFilter(viewRegionQueryDto));
    }

    private getFilter(queryDto: ViewNetworkAffiliationQueryDTO): FindOptionsWhere<NetworkAffiliationEntity> {
        const whereOptions: FindOptionsWhere<NetworkAffiliationEntity> = {};

        if (queryDto.networkAffiliationIds) {
            whereOptions.id = queryDto.networkAffiliationIds.length === 1 ? queryDto.networkAffiliationIds[0] : In(queryDto.networkAffiliationIds);
        }

        return whereOptions
    }

    public async add(createDto: CreateUpdateNetworkAffiliationDto, userId: number): Promise<ViewNetworkAffiliationDto> {
        let entity: NetworkAffiliationEntity | null = await this.networkAffiliationsRepo.findOneBy({
            name: createDto.name,
        });

        if (entity) {
            throw new NotFoundException(`Network affiliation with name ${createDto.name} exists`);
        }

        entity = this.networkAffiliationsRepo.create({
            name: createDto.name,
        });

        this.updateEntity(entity, createDto, userId);

        await this.networkAffiliationsRepo.save(entity);

        // Important. Retrieve the entity with updated properties like  name before creating the view
        return this.findOne(entity.id);

    }

    public async update(id: number, updateDto: CreateUpdateNetworkAffiliationDto, userId: number): Promise<ViewNetworkAffiliationDto> {
        const entity: NetworkAffiliationEntity = await this.findEntity(id);

        this.updateEntity(entity, updateDto, userId);

        await this.networkAffiliationsRepo.save(entity);

        return this.createViewDto(entity);
    }

    public async delete(id: number): Promise<number> {
        await this.networkAffiliationsRepo.remove(await this.findEntity(id));
        return id;
    }

    public async deleteAll(): Promise<boolean> {
        const entities: NetworkAffiliationEntity[] = await this.networkAffiliationsRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.networkAffiliationsRepo.remove(entities);
        return true;
    }

    private updateEntity(entity: NetworkAffiliationEntity, dto: CreateUpdateNetworkAffiliationDto, userId: number): void {
        entity.name = dto.name;
        entity.description = dto.description ? dto.description : null;
        entity.parentNetworkId = dto.parentNetworkId;
        entity.extraMetadata = dto.extraMetadata? dto.extraMetadata: null ; 
        entity.comment = dto.comment ? dto.comment : null; 
        entity.entryUserId = userId;
    }

    private createViewDto(entity: NetworkAffiliationEntity): ViewNetworkAffiliationDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            parentNetworkId: entity.parentNetworkId,
            extraMetadata: entity.extraMetadata,
            comment: entity.comment,
        };
    }

    public async checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): Promise<MetadataUpdatesDto> {
        let changesDetected: boolean = false;

        const serverCount = await this.networkAffiliationsRepo.count();

        if (serverCount !== updatesQueryDto.lastModifiedCount) {
            // If number of records in server are not the same as those in the client then changes detected
            changesDetected = true;
        } else {
            const whereOptions: FindOptionsWhere<NetworkAffiliationEntity> = {};

            if (updatesQueryDto.lastModifiedDate) {
                whereOptions.entryDateTime = MoreThan(new Date(updatesQueryDto.lastModifiedDate));
            }

            // If there was any changed record then changes detected
            changesDetected = (await this.networkAffiliationsRepo.count({ where: whereOptions })) > 0
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
