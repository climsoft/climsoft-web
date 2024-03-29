import { ConsoleLogger, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Repository } from 'typeorm';
import { StationEntity, StationLogVo } from '../entities/station.entity';
import { CreateUpdateStationDto } from '../dtos/create-update-station.dto';
import { ViewStationDto } from '../dtos/view-station.dto';

@Injectable()
export class StationsService {

    constructor(
        @InjectRepository(StationEntity) private readonly stationRepo: Repository<StationEntity>,
    ) { }

    public async findStations(ids?: string[]): Promise<ViewStationDto[]> {
        const findOptions: FindManyOptions<StationEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (ids && ids.length > 0) {
            findOptions.where = { id: In(ids) };
        }

        const entities = await this.stationRepo.find(findOptions);

        return entities.map(entity => {
            return this.createViewDto(entity);
        });

    }

    public async findStation(id: string): Promise<ViewStationDto> {
        const entity = await this.stationRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException(`Station #${id} not found`);
        }
        return this.createViewDto(entity);
    }

    public async saveStation(createStationDto: CreateUpdateStationDto, userId: number): Promise<ViewStationDto> {

        let stationEntity: StationEntity | null = await this.stationRepo.findOneBy({
            id: createStationDto.id,
        });

        if (!stationEntity) {
            stationEntity = this.stationRepo.create({
                id: createStationDto.id,
            });
        }

        this.updateStationEntity(stationEntity, createStationDto, userId);

        return this.createViewDto(await this.stationRepo.save(stationEntity));
    }


    private updateStationEntity(entity: StationEntity, dto: CreateUpdateStationDto, userId: number): void {
        entity.name = dto.name;
        entity.description = dto.description;
        entity.location = dto.location;
        entity.elevation = dto.elevation;
        entity.stationObsMethod = dto.stationObsMethod;
        entity.stationObsEnvironmentId = dto.stationObsEnvironmentId;
        entity.stationObsFocusId = dto.stationObsFocusId;
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
        //TODO. For some reason, typeorm sets this to x and y when retrieving Point. Investigate why.
        
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            location: entity.location,
            elevation: entity.elevation,
            stationObsMethod: entity.stationObsMethod,
            stationObsEnvironmentId: entity.stationObsEnvironmentId,
            stationObsEnvironmentName: entity.stationObsEnvironment ? entity.stationObsEnvironment.name : null,
            stationObsFocusId: entity.stationObsFocusId,
            stationObsFocusName: entity.stationObsFocus ? entity.stationObsFocus.name : null,
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
