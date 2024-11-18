import { FindManyOptions, FindOptionsWhere, In, MoreThan, Repository } from "typeorm"; 
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm"; 
import { StationObsEnvironmentEntity } from "../entities/station-observation-environment.entity";
import { StationObsEnvChangesDto } from "../dtos/station-obs-env-changes.dto";

@Injectable()
export class StationObsEnvService {

    public constructor(
        @InjectRepository(StationObsEnvironmentEntity) private stationObsEnvRepo: Repository<StationObsEnvironmentEntity>) {
    }

    public async find(ids?: number[]): Promise<StationObsEnvironmentEntity[]> {
        const findOptions: FindManyOptions<StationObsEnvironmentEntity> = {
            order: { id: "ASC" }
        };

        if (ids && ids.length > 0) {
            findOptions.where = { id: In(ids) };
        }

       return this.stationObsEnvRepo.find(findOptions);
    }

    public async findUpdated(entryDatetime: string): Promise<StationObsEnvChangesDto> {
        const whereOptions: FindOptionsWhere<StationObsEnvironmentEntity> = {
            entryDateTime: MoreThan(new Date(entryDatetime))
        };

        const updated = (await this.stationObsEnvRepo.find({
            where: whereOptions
        }));

        const totalCount = await this.stationObsEnvRepo.count();

        return { updated: updated, totalCount: totalCount };

    }


 
}