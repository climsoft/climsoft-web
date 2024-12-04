import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOptionsWhere, In, MoreThan, Repository } from 'typeorm';
import { StationEntity } from '../entities/station.entity';
import { UpdateStationDto } from '../dtos/update-station.dto';
import { CreateStationDto } from '../dtos/create-update-station.dto';
import { ViewStationQueryDTO } from '../dtos/view-station-query.dto';
import { MetadataUpdatesQueryDto } from 'src/metadata/metadata-updates/dtos/metadata-updates-query.dto';
import { MetadataUpdatesDto } from 'src/metadata/metadata-updates/dtos/metadata-updates.dto';

@Injectable()
export class StationsService {

    constructor(
        @InjectRepository(StationEntity) private readonly stationRepo: Repository<StationEntity>,
    ) { }

    public async find(viewStationQueryDto?: ViewStationQueryDTO): Promise<CreateStationDto[]> {
        const findOptions: FindManyOptions<StationEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (viewStationQueryDto) {
            findOptions.where = this.getFilter(viewStationQueryDto);
            // If page and page size provided, skip and limit accordingly
            if (viewStationQueryDto.page && viewStationQueryDto.page > 0 && viewStationQueryDto.pageSize) {
                findOptions.skip = (viewStationQueryDto.page - 1) * viewStationQueryDto.pageSize;
                findOptions.take = viewStationQueryDto.pageSize;
            }
        }

        return (await this.stationRepo.find(findOptions)).map(entity => {
            return this.createViewDto(entity);
        });
    }

    public async count(viewStationQueryDto: ViewStationQueryDTO): Promise<number> {
        return this.stationRepo.countBy(this.getFilter(viewStationQueryDto));
    }

    private getFilter(viewStationQueryDto: ViewStationQueryDTO): FindOptionsWhere<StationEntity> {
        const whereOptions: FindOptionsWhere<StationEntity> = {};

        if (viewStationQueryDto.stationIds) {
            whereOptions.id = viewStationQueryDto.stationIds.length === 1 ? viewStationQueryDto.stationIds[0] : In(viewStationQueryDto.stationIds);
        }

        if (viewStationQueryDto.obsProcessingMethods) {
            whereOptions.obsProcessingMethod = viewStationQueryDto.obsProcessingMethods.length === 1 ? viewStationQueryDto.obsProcessingMethods[0] : In(viewStationQueryDto.obsProcessingMethods);
        }

        if (viewStationQueryDto.obsEnvironmentIds) {
            whereOptions.obsEnvironmentId = viewStationQueryDto.obsEnvironmentIds.length === 1 ? viewStationQueryDto.obsEnvironmentIds[0] : In(viewStationQueryDto.obsEnvironmentIds);
        }

        if (viewStationQueryDto.obsFocusIds) {
            whereOptions.obsFocusId = viewStationQueryDto.obsFocusIds.length === 1 ? viewStationQueryDto.obsFocusIds[0] : In(viewStationQueryDto.obsFocusIds);
        }

        return whereOptions
    }

    public async findOne(id: string): Promise<CreateStationDto> {
        const entity = await this.getEntity(id);
        return this.createViewDto(entity);
    }

    public async add(createDto: CreateStationDto, userId: number): Promise<CreateStationDto> {
        let entity: StationEntity | null = await this.stationRepo.findOneBy({
            id: createDto.id,
        });

        if (entity) {
            throw new NotFoundException(`Station #${createDto.id} exists`);
        }

        entity = this.stationRepo.create({
            id: createDto.id,
        });

        this.updateStationEntity(entity, createDto, userId);

        await this.stationRepo.save(entity);

        // Retrieve the station with updated properties
        return this.findOne(entity.id);
    }

    public async update(id: string, updateDto: UpdateStationDto, userId: number): Promise<CreateStationDto> {
        const entity: StationEntity = await this.getEntity(id);

        this.updateStationEntity(entity, updateDto, userId);

        console.log('entity: ', entity);

        return this.createViewDto(await this.stationRepo.save(entity));
    }

    public async delete(id: string): Promise<string> {
        await this.stationRepo.remove(await this.getEntity(id));
        return id;
    }

    private async getEntity(id: string): Promise<StationEntity> {
        const entity = await this.stationRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Station #${id} not found`);
        }
        return entity;
    }

    private updateStationEntity(entity: StationEntity, dto: UpdateStationDto, userId: number): void {
        entity.name = dto.name;
        entity.description = dto.description ? dto.description : '';
        entity.location = (dto.longitude !== undefined && dto.longitude !== null) && (dto.latitude !== undefined && dto.latitude !== null) ? {
            type: "Point",
            coordinates: [dto.longitude, dto.latitude],
        } : null;
        entity.elevation = (dto.elevation !== undefined && dto.elevation !== null) ? dto.elevation : null;
        entity.obsProcessingMethod = dto.stationObsProcessingMethod;
        entity.obsEnvironmentId = dto.stationObsEnvironmentId ? dto.stationObsEnvironmentId : null;
        entity.obsFocusId = dto.stationObsFocusId ? dto.stationObsFocusId : null;
        entity.wmoId = dto.wmoId ? dto.wmoId : null;
        entity.wigosId = dto.wigosId ? dto.wigosId : null;
        entity.icaoId = dto.icaoId ? dto.icaoId : null;
        entity.status = dto.status ? dto.status : null;
        entity.dateEstablished = dto.dateEstablished ? new Date(dto.dateEstablished) : null;
        entity.dateClosed = dto.dateClosed ? new Date(dto.dateClosed) : null;
        entity.comment = dto.comment ? dto.comment : null;
        entity.entryUserId = userId;
    }

    private createViewDto(entity: StationEntity): CreateStationDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            longitude: entity.location ? entity.location.coordinates[0] : null,
            latitude: entity.location ? entity.location.coordinates[1] : null,
            elevation: entity.elevation,
            stationObsProcessingMethod: entity.obsProcessingMethod,
            stationObsEnvironmentId: entity.obsEnvironmentId,
            stationObsFocusId: entity.obsFocusId,
            wmoId: entity.wmoId,
            wigosId: entity.wigosId,
            icaoId: entity.icaoId,
            status: entity.status,
            dateEstablished: entity.dateEstablished ? entity.dateEstablished.toISOString() : null,
            dateClosed: entity.dateClosed ? entity.dateClosed.toISOString() : null,
            comment: entity.comment,
        }
    }

    public async bulkPut(dtos: CreateStationDto[], userId: number) {
        const entities: Partial<StationEntity>[] = [];
        for (const dto of dtos) {
            const entity: StationEntity = await this.stationRepo.create({
                id: dto.id,
            });

            this.updateStationEntity(entity, dto, userId);
            entities.push(entity);
        }

        const batchSize = 1000; // batch size of 1000 seems to be safer (incase there are comments) and faster.
        for (let i = 0; i < entities.length; i += batchSize) {
            const batch = entities.slice(i, i + batchSize);
            await this.insertOrUpdateStationValues(batch);
        }
    }

    private async insertOrUpdateStationValues(stationsData: Partial<StationEntity>[]): Promise<void> {
        await this.stationRepo
            .createQueryBuilder()
            .insert()
            .into(StationEntity)
            .values(stationsData)
            .orUpdate(
                [
                    "name",
                    "description",
                    "observation_processing_method",
                    "location",
                    "elevation",
                    "observation_environment_id",
                    "observation_focus_id",
                    "organisation_id",
                    "wmo_id",
                    "wigos_id",
                    "icao_id",
                    "status",
                    "date_established",
                    "date_closed",
                    "comment",
                    "entry_user_id"],
                ["id"],
                {
                    skipUpdateIfNoValuesChanged: true,
                }
            )
            .execute();
    }

    public async deleteAll(): Promise<boolean> {
        const entities: StationEntity[] = await this.stationRepo.find();
        // Note, don't use .clear() because truncating a table referenced in a foreign key constraint is not supported
        await this.stationRepo.remove(entities);
        return true;
    }

    public async checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto, stationIds?: string[]): Promise<MetadataUpdatesDto> {
        let changesDetected: boolean = false;

        const serverCount = await this.stationRepo.count();

        if (serverCount !== updatesQueryDto.lastModifiedCount) {
            // If number of records in server are not the same as those in the client the changes detected
            changesDetected = true;
        } else {
            const whereOptions: FindOptionsWhere<StationEntity> = {};

            if (updatesQueryDto.lastModifiedDate) {
                whereOptions.entryDateTime = MoreThan(new Date(updatesQueryDto.lastModifiedDate));
            }

            if (stationIds) {
                whereOptions.id = stationIds.length === 1 ? stationIds[0] : In(stationIds);
            }

            // If there was any changed record then changes detected
            changesDetected = (await this.stationRepo.count({ where: whereOptions })) > 0
        }

        if (changesDetected) {
            // If any changes detected then return all records 
            const allRecords = (await this.stationRepo.find()).map(entity => {
                return this.createViewDto(entity);
            });

            return { metadataChanged: true, metadataRecords: allRecords }
        } else {
            // If no changes detected then indicate no metadata changed
            return { metadataChanged: false }
        }
    }

}
