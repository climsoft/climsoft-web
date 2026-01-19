import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { StationFormEntity } from "../entities/station-form.entity";
import { SourceSpecificationsService } from "src/metadata/source-specifications/services/source-specifications.service";
import { ViewSourceSpecificationDto } from "src/metadata/source-specifications/dtos/view-source-specification.dto";

@Injectable()
export class StationFormsService {

    public constructor(
        @InjectRepository(StationFormEntity) private stationFormsRepo: Repository<StationFormEntity>,
        private sourcesService: SourceSpecificationsService) {
    }

    public async getFormsAssignedToStation(stationId: string): Promise<ViewSourceSpecificationDto[]> {
        const stationForms: StationFormEntity[] = await this.stationFormsRepo.findBy({ stationId: stationId });
        const stationFormIds: number[] = stationForms.map(form => form.formId);
        return stationFormIds.length > 0 ? await this.sourcesService.findSourcesByIds(stationFormIds) : [];
    }

    public async putFormsAssignedToStation(stationId: string, formIds: number[], userId: number): Promise<number[]> {
        // Delete all station forms first
        await this.deleteFormsAsignedToStation(stationId);

        //save new station forms
        const stationFormEntities: StationFormEntity[] = [];
        for (const formId of formIds) {
            stationFormEntities.push(this.stationFormsRepo.create({
                stationId: stationId,
                formId: formId,
                entryUserId: userId
            }));
        }

        return (await this.stationFormsRepo.save(stationFormEntities)).map(form => form.formId);
    }

    public async deleteFormsAsignedToStation(stationId: string): Promise<void> {
        //fetch existing station elements
        const existingElements = await this.stationFormsRepo.findBy({
            stationId: stationId,
        });

        await this.stationFormsRepo.remove(existingElements);
    }

    public async getStationsAssignedToUseForm(formId: number): Promise<string[]> {
        const stationForms: StationFormEntity[] = await this.stationFormsRepo.findBy({ formId: formId });
        return stationForms.map(form => form.stationId);
    }

    public async putStationsAssignedToUseForm(formId: number, stationIds: string[], userId: number): Promise<string[]> {
        // Delete station forms first
        await this.deleteStationsAssignedToUseForm(formId);

        // Save new station forms
        const stationFormEntities: StationFormEntity[] = [];
        for (const stationId of stationIds) {
            const stationFormEntity: StationFormEntity = this.stationFormsRepo.create({
                stationId: stationId,
                formId: formId,
                entryUserId: userId,
            });

            stationFormEntities.push(stationFormEntity);
        }

        return (await this.stationFormsRepo.save(stationFormEntities)).map(form => form.stationId);
    }

    public async deleteStationsAssignedToUseForm(formId: number): Promise<void> {
        // Fetch existing station forms
        const existingStationsForms: StationFormEntity[] = await this.stationFormsRepo.findBy({
            formId: formId,
        });

        await this.stationFormsRepo.remove(existingStationsForms);
    }

    public async getStationCountPerForm(): Promise<{ formId: number; stationCount: number }[]> {
        return await this.stationFormsRepo
            .createQueryBuilder('sf') // Alias is required 
            .select('sf.form_id', 'formId') // Directly referencing source_id
            .addSelect('COUNT(DISTINCT sf.station_id)', 'stationCount')
            .groupBy('sf.form_id')
            .getRawMany();
    }

}