import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm"; 
import { StationNetworkAffiliationEntity } from "../entities/station-network-affiliation.entity";
import { NetworkAffiliationsService } from "src/metadata/network-affiliations/services/network-affiliations.service";
import { ViewNetworkAffiliationDto } from "src/metadata/network-affiliations/dtos/view-network-affiliation.dto";

@Injectable()
export class StationNetworkAffiliationsService {

    public constructor(
        @InjectRepository(StationNetworkAffiliationEntity) private stationNetworksRepo: Repository<StationNetworkAffiliationEntity>,
        private networkAffiliationService: NetworkAffiliationsService) {
    }

    public async getNetworksAssignedToStation(stationId: string): Promise<ViewNetworkAffiliationDto[]> {
        const stationNetworks: StationNetworkAffiliationEntity[] = await this.stationNetworksRepo.findBy({ stationId: stationId });
        const stationNetworkIds: number[] = stationNetworks.map(form => form.networkAffiliationId);
        return stationNetworkIds.length > 0 ? await this.networkAffiliationService.find({networkAffiliationIds: stationNetworkIds}) : [];
    }

    public async putNetworksAssignedToStation(stationId: string, networkIds: number[], userId: number): Promise<number[]> {
        // Delete all station forms first
        await this.deleteNetworksAsignedToStation(stationId);

        //save new station forms
        const stationFormEntities: StationNetworkAffiliationEntity[] = [];
        for (const networkId of networkIds) {        
            stationFormEntities.push(this.stationNetworksRepo.create({
                stationId: stationId,
                networkAffiliationId: networkId,
                entryUserId: userId
            }));
        }

        return (await this.stationNetworksRepo.save(stationFormEntities)).map(item => item.networkAffiliationId);
    }

    public async deleteNetworksAsignedToStation(stationId: string): Promise<void> {
        //fetch existing station elements
        const existingElements = await this.stationNetworksRepo.findBy({
            stationId: stationId,
        });

        await this.stationNetworksRepo.remove(existingElements);
    }

    public async getStationsAssignedToNetwork(networkAffiliationId: number): Promise<string[]> {
        const stationNetworks: StationNetworkAffiliationEntity[] = await this.stationNetworksRepo.findBy({ networkAffiliationId: networkAffiliationId });
        return stationNetworks.map(form => form.stationId);
    }

    public async putStationsAssignedToNetwork(networkAffiliationId: number, stationIds: string[], userId: number): Promise<string[]> {
        // Delete station networks first
        await this.deleteStationsAssignedToNetwork(networkAffiliationId);
        
        // Save new station networks
        const stationNetworkEntities: StationNetworkAffiliationEntity[] = [];
        for (const stationId of stationIds) {
            const stationNetworkEntity: StationNetworkAffiliationEntity = this.stationNetworksRepo.create({
                stationId: stationId,
                networkAffiliationId: networkAffiliationId,
                entryUserId: userId,
            });

            stationNetworkEntities.push(stationNetworkEntity);
        }

        return (await this.stationNetworksRepo.save(stationNetworkEntities)).map(form => form.stationId);
    }

    public async deleteStationsAssignedToNetwork(networkAffiliationId: number): Promise<void> {
        // Fetch existing station forms
        const existingStationsForms: StationNetworkAffiliationEntity[] = await this.stationNetworksRepo.findBy({
            networkAffiliationId: networkAffiliationId,
        });

        await this.stationNetworksRepo.remove(existingStationsForms);
    }

    public async getStationCountPerNetwork(): Promise<{ networkAffiliationId: number; stationCount: number }[]> {
        return await this.stationNetworksRepo
            .createQueryBuilder('sf') // Alias is required 
            .select('sf.network_affiliation_id', 'networkAffiliationId') // Directly referencing source_id
            .addSelect('COUNT(DISTINCT sf.station_id)', 'stationCount')
            .groupBy('sf.network_affiliation_id')
            .getRawMany();
    }

}