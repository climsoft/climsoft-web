import {  Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElementSubdomainEntity } from 'src/metadata/elements/entities/element-subdomain.entity';
import { SeedElementSubdomains1710833102997 } from 'src/migrations/1710833102997-SeedElementSubdomains';
import { ElementTypeEntity } from 'src/metadata/elements/entities/element-type.entity';
import { SeedElementTypes1710833156699 } from 'src/migrations/1710833156699-SeedElementTypes';
import { ElementEntity } from 'src/metadata/elements/entities/element.entity';
import { SeedElements1710833167092 } from 'src/migrations/1710833167092-SeedElements';
import { StationObservationFocusEntity } from 'src/metadata/stations/entities/station-observation-focus.entity';
import { StationObsEnvironmentEntity } from 'src/metadata/stations/entities/station-observation-environment.entity';
import { SeedObservationEnvironments1711195885141 } from 'src/migrations/1711195885141-SeedObservationEnvironments';
import { SeedObservationFocuses1711196308488 } from 'src/migrations/1711196308488-SeedObservationFocuses';

@Injectable()
export class SeedMetadataService {
    constructor(
        @InjectRepository(ElementSubdomainEntity) private elementSubDomainRepo: Repository<ElementSubdomainEntity>,
        @InjectRepository(ElementTypeEntity) private elementTypeRepo: Repository<ElementTypeEntity>,
        @InjectRepository(ElementEntity) private elementRepo: Repository<ElementEntity>,
        @InjectRepository(StationObsEnvironmentEntity) private stationObservationEnvironmentRepo: Repository<StationObsEnvironmentEntity>,
        @InjectRepository(StationObservationFocusEntity) private stationObservationFocusRepo: Repository<StationObservationFocusEntity>,) { }


    public async seedMetadata() {
        await this.seedElementSubdomains();
        await this.seedElementTypes();
        await this.seedElements();
        await this.seedStationObservationEnvironment();
        await this.seedStationObservationFocuses();
    }

  
    private async seedElementSubdomains() {
        const count = await this.elementSubDomainRepo.count();
        if (count === 0) {
            await this.elementSubDomainRepo.manager.query(SeedElementSubdomains1710833102997.INSERT_ELEMENT_SQL);
        }   
    }

    private async seedElementTypes() {
        const count = await this.elementTypeRepo.count();
        if (count === 0) {
            await this.elementTypeRepo.manager.query(SeedElementTypes1710833156699.INSERT_ELEMENT_TYPES);
        }   
    }

    private async seedElements() {
        // TODO. Later use the element service 
        const count = await this.elementRepo.count();
        if (count === 0) {
            await this.elementRepo.manager.query(SeedElements1710833167092.INSERT_ELEMENTS);
        }   
    }

    private async seedStationObservationEnvironment() {
        // TODO. Later use the element service 
        const count = await this.stationObservationEnvironmentRepo.count();
        if (count === 0) {
            await this.stationObservationEnvironmentRepo.manager.query(SeedObservationEnvironments1711195885141.INSERT_STATION_OBSERVATION_ENVIRONMENTS);
        }   
    }

    private async seedStationObservationFocuses() {
        // TODO. Later use the element service 
        const count = await this.stationObservationFocusRepo.count();
        if (count === 0) {
            await this.stationObservationFocusRepo.manager.query(SeedObservationFocuses1711196308488.INSERT_STATION_OBSERVATION_FOCUSES);
        }   
    }


}
