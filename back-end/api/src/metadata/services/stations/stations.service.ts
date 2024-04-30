import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StationEntity } from '../../entities/stations/station.entity';
import { CreateStationDto } from '../../dtos/stations/create-update-station.dto';
import { ViewStationDto } from '../../dtos/stations/view-station.dto';
import { StringUtils } from 'src/shared/utils/string.utils';
import { IBaseStringService } from 'src/shared/services/base-string-service.interface';
import { UpdateStationDto } from 'src/metadata/dtos/stations/update-station.dto'; 

@Injectable()
export class StationsService implements IBaseStringService<CreateStationDto, UpdateStationDto, ViewStationDto> {

    constructor(
        @InjectRepository(StationEntity) private readonly stationRepo: Repository<StationEntity>,
    ) { }

    public async findAll(): Promise<ViewStationDto[]> {
        const entities = await this.stationRepo.find({
            order: {
                id: "ASC"
            }
        });

        return entities.map(entity => {
            return this.createViewDto(entity);
        });

    }

    public async findSome(ids: string[]): Promise<ViewStationDto[]> {
        const entities = await this.stationRepo.find({
            order: {
                id: "ASC",
            },
            where: { id: In(ids) }
        });

        return entities.map(entity => {
            return this.createViewDto(entity);
        });

    }

    public async findOne(id: string): Promise<ViewStationDto> {
        const entity = await this.getEntity(id);
        return this.createViewDto(entity);
    }

    public async create(createDto: CreateStationDto, userId: number): Promise<ViewStationDto> {

        let entity: StationEntity | null = await this.stationRepo.findOneBy({
            id: createDto.id,
        });

        if (entity) {
            throw new NotFoundException(`Station #${createDto.id} exists `);
        }

        entity = this.stationRepo.create({
            id: createDto.id,
        });

        this.updateStationEntity(entity, createDto, userId);

        await this.stationRepo.save(entity);

        // Retrieve the station with updated properties
        return this.findOne(entity.id);
    }

    public async update(id: string, updateDto: UpdateStationDto, userId: number): Promise<ViewStationDto> {

        const entity: StationEntity  = await this.getEntity(id);

        this.updateStationEntity(entity, updateDto, userId);

        return this.createViewDto(await this.stationRepo.save(entity));
    }

    public async delete(id: string, userId: number): Promise<string> {
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
        entity.description = dto.description;
        entity.location = dto.location;
        entity.elevation = dto.elevation;
        entity.obsProcessingMethod = dto.stationObsProcessingMethod;
        entity.obsEnvironmentId = dto.stationObsEnvironmentId;
        entity.obsFocusId = dto.stationObsFocusId;
        entity.wmoId = dto.wmoId;
        entity.wigosId = dto.wigosId;
        entity.icaoId = dto.icaoId;
        entity.status = dto.status;
        entity.dateEstablished = dto.dateEstablished ? new Date(dto.dateEstablished) : null;
        entity.dateClosed = dto.dateClosed ? new Date(dto.dateClosed) : null;
        entity.comment = dto.comment;
        entity.entryUserId = userId;
        entity.entryDateTime = new Date();
        entity.log = null;
    }

    private createViewDto(entity: StationEntity): ViewStationDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            location: entity.location,
            elevation: entity.elevation,
            stationObsProcessingMethod: entity.obsProcessingMethod,
            stationObsProcessingMethodName: StringUtils.capitalizeFirstLetter(entity.obsProcessingMethod),
            stationObsEnvironmentId: entity.obsEnvironmentId,
            stationObsEnvironmentName: entity.obsEnvironment ? entity.obsEnvironment.name : null,
            stationObsFocusId: entity.obsFocusId,
            stationObsFocusName: entity.obsFocus ? entity.obsFocus.name : null,
            wmoId: entity.wmoId,
            wigosId: entity.wigosId,
            icaoId: entity.icaoId,
            status: entity.status,
            dateEstablished: entity.dateEstablished ? entity.dateEstablished.toISOString() : null,
            dateClosed: entity.dateClosed ? entity.dateClosed.toISOString() : null,
            comment: entity.comment,
        }
    }




}
