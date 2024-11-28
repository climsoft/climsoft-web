import { FindManyOptions, FindOptionsWhere, In, MoreThan, Repository } from "typeorm"; 
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm"; 
import { StationObservationEnvironmentEntity } from "../entities/station-observation-environment.entity";
import { MetadataUpdatesQueryDto } from "src/metadata/metadata-updates/dtos/metadata-updates-query.dto";
import { MetadataUpdatesDto } from "src/metadata/metadata-updates/dtos/metadata-updates.dto";
import { StationObservationEnvironmentDto } from "../dtos/view-station-obs-env.dto";

@Injectable()
export class StationObsEnvService {

    public constructor(
        @InjectRepository(StationObservationEnvironmentEntity) private stationObsEnvRepo: Repository<StationObservationEnvironmentEntity>) {
    }

    public async find(ids?: number[]): Promise<StationObservationEnvironmentDto[]> {
        const findOptions: FindManyOptions<StationObservationEnvironmentEntity> = {
            order: { id: "ASC" }
        };

        if (ids && ids.length > 0) {
            findOptions.where = { id: In(ids) };
        }

       return  (await this.stationObsEnvRepo.find(findOptions)).map(item => {
        return { id: item.id, name: item.name, description: item.description }
    });
    }
    
    public async checkUpdates(updatesQueryDto: MetadataUpdatesQueryDto): Promise<MetadataUpdatesDto> {
        let changesDetected: boolean = false;

        const serverCount = await this.stationObsEnvRepo.count();

        if (serverCount !== updatesQueryDto.lastModifiedCount) {
            // If number of records in server are not the same as those in the client then changes detected
            changesDetected = true;
        } else {
            const whereOptions: FindOptionsWhere<StationObservationEnvironmentEntity> = {};

            if (updatesQueryDto.lastModifiedDate) {
                whereOptions.entryDateTime = MoreThan(new Date(updatesQueryDto.lastModifiedDate));
            }

            // If there was any changed record then changes detected
            changesDetected = (await this.stationObsEnvRepo.count({ where: whereOptions })) > 0
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