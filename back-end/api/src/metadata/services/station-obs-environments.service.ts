import { FindManyOptions, In, Repository } from "typeorm"; 
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm"; 
import { StationObsEnvironmentEntity } from "../entities/station-observation-environment.entity";

@Injectable()
export class StationObsEnvironmentsService {

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


 
}