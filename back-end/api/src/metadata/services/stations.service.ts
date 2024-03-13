import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Repository } from 'typeorm';
import { StationEntity, StationLogVo } from '../entities/station.entity';
import { CreateStationDto } from '../dtos/create-station.dto';
import { SourcesService } from './sources.service'; 
import { ObjectUtils } from 'src/shared/utils/object.util'; 

@Injectable()
export class StationsService {

    constructor(
        @InjectRepository(StationEntity) private readonly stationRepo: Repository<StationEntity>, 
      
        private readonly sourcesService: SourcesService,
    ) { }

    async findStations(ids?: string[]) {
        const findOptions: FindManyOptions<StationEntity> = {
            order: {
                id: "ASC"
            }
        };

        if (ids && ids.length > 0) {
            findOptions.where = { id: In(ids) };
        }

        return this.stationRepo.find(findOptions);
    }

    async findStation(id: string) {
        const station = await this.stationRepo.findOneBy({
            id: id,
        });

        if (!station) {
            throw new NotFoundException(`Station #${id} not found`);
        }
        return station;
    }

    async saveStations(createStationDtos: CreateStationDto[], userId: number) {
        const stationEntities: StationEntity[] = [];

        for (const createStationDto of createStationDtos) {
            let stationEntity = await this.stationRepo.findOneBy({
                id: createStationDto.id,
            });

            if (stationEntity) {
                const oldChanges: StationLogVo = this.getStationLogFromEntity(stationEntity);
                const newChanges: StationLogVo = this.getStationLogFromDto(createStationDto, userId);

                //if no changes, then no need to save
                if (ObjectUtils.areObjectsEqual<StationLogVo>(oldChanges, newChanges, ["entryUserId","entryDateTime"])) {
                    continue;
                }
            } else {
                stationEntity = this.stationRepo.create({
                    id: createStationDto.id,
                });
            }

            this.updateStationEntity(stationEntity, createStationDto, userId);
            stationEntities.push(stationEntity);
        }

        return this.stationRepo.save(stationEntities);
    }

    private getStationLogFromEntity(entity: StationEntity): StationLogVo {
        return {
            name: entity.name,
            description: entity.description,
            comment: entity.comment,
            entryUserId: entity.entryUserId,
            entryDateTime: entity.entryDateTime,
        };
    }

    private getStationLogFromDto(dto: CreateStationDto, userId: number): StationLogVo {
        return {
            name: dto.name,
            description: dto.description,
            comment: dto.comment,
            entryUserId: userId,
            entryDateTime: new Date(),
        };
    }

    private updateStationEntity(entity: StationEntity, dto: CreateStationDto, userId: number): void {
        entity.name = dto.name;
        entity.description = dto.description;
        entity.comment = dto.comment;
        entity.entryUserId = userId;
        entity.entryDateTime =new Date();
        entity.log = ObjectUtils.getNewLog<StationLogVo>(entity.log, this.getStationLogFromEntity(entity));
    }

  


}
