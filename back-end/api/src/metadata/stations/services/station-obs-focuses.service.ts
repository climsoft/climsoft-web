import { FindManyOptions, FindOptionsWhere, In, MoreThan, Repository } from "typeorm"; 
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";  
import { StationObservationFocusEntity } from "../entities/station-observation-focus.entity";
import { StationObsFocusChangesDto } from "../dtos/station-obs-focus-changes.dto";

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

    public async findUpdated(entryDatetime: string): Promise<StationObsFocusChangesDto> {
        const whereOptions: FindOptionsWhere<StationObservationFocusEntity> = {
            entryDateTime: MoreThan(new Date(entryDatetime))
        };

        const updated = (await this.stationObsFocusRepo.find({
            where: whereOptions
        }));

        const totalCount = await this.stationObsFocusRepo.count();

        return { updated: updated, totalCount: totalCount };

    }


}