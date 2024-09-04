import { FindManyOptions, In, Repository } from "typeorm"; 
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";  
import { StationObservationFocusEntity } from "../entities/station-observation-focus.entity";

@Injectable()
export class StationObsFocusesService {

    public constructor(
        @InjectRepository(StationObservationFocusEntity) private stationObsFocusRepo: Repository<StationObservationFocusEntity>) {
    }

    public async find(ids?: number[]): Promise<StationObservationFocusEntity[]> {
        const findOptions: FindManyOptions<StationObservationFocusEntity> = {
            order: { id: "ASC" }
        };

        if (ids && ids.length > 0) {
            findOptions.where = { id: In(ids) };
        }

       return this.stationObsFocusRepo.find(findOptions);
    }



}