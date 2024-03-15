import { In, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DateUtils } from "src/shared/utils/date.utils";
import { StationFormEntity } from "../entities/station-form.entity";
import { SourcesService } from "./sources.service";
import { ViewSourceDto } from "../dtos/view-source.dto";

@Injectable()
export class StationFormsService {

    public constructor(
        @InjectRepository(StationFormEntity) private stationFormsRepo: Repository<StationFormEntity>,
        private sourcesService: SourcesService) {
    }

    public async findForms(stationId: string): Promise<ViewSourceDto[]> {
        const stationForms: StationFormEntity[] = await this.stationFormsRepo.findBy({ stationId: stationId });
        const stationFormIds: number[] = stationForms.map(form => form.sourceId);
        return stationFormIds.length > 0 ? await this.sourcesService.findSourcesByIds(stationFormIds) : [];
    }

    public async saveForms(stationId: string, formIds: number[], userId: number): Promise<number[]> {
        //fetch existing station elements
        const existingForms: StationFormEntity[] = await this.stationFormsRepo.find({
            where: {
                stationId: stationId,
                sourceId: In(formIds),
            }
        });

        // get existing form ids from the entities
        const existingFormIds = existingForms.map(form => form.sourceId);

        //save new station forms
        const stationFormEntities: StationFormEntity[] = [];
        for (const id of formIds) {
            if (!existingFormIds.includes(id)) {
                const stationFormEntity: StationFormEntity = this.stationFormsRepo.create({
                    stationId: stationId,
                    sourceId: id,
                    entryUserId: userId,
                    entryDateTime: DateUtils.getTodayDateInSQLFormat()
                });

                stationFormEntities.push(stationFormEntity);
            }
        }

        return (await this.stationFormsRepo.save(stationFormEntities)).map(form => form.sourceId);
    }

    public async deleteForms(stationId: string, formId: number[]): Promise<number[]> {
        //fetch existing station elements
        const existingElements = await this.stationFormsRepo.find({
            where: {
                stationId: stationId,
                sourceId: In(formId),
            }
        });

        const FormsDeleted: StationFormEntity[] = await this.stationFormsRepo.remove(existingElements);

        return FormsDeleted.map(data => data.sourceId);
    }


}