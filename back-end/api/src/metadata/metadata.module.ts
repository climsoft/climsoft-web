import { Module } from '@nestjs/common';
import { StationEntity } from './stations/entities/station.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationsController } from './stations/controllers/stations.controller';
import { StationsService } from './stations/services/stations.service';
import { ElementsController } from './elements/controllers/elements.controller';
import { ElementEntity } from './elements/entities/element.entity';
import { SourcesController } from 'src/metadata/sources/controllers/sources.controller';
import { StationElementEntity } from './stations/entities/station-element.entity';
import { StationFormEntity } from './stations/entities/station-form.entity';
import { InstrumentEntity } from './instruments/entities/instrument.entity';
import { InstrumentTypeEntity } from './instruments/entities/instrument-type.entity';
import { ElementSubdomainEntity } from './elements/entities/element-subdomain.entity';
import { ElementTypeEntity } from './elements/entities/element-type.entity';
import { UserModule } from 'src/user/user.module';
import { StationElementsService } from './stations/services/station-elements.service';
import { StationElementsController } from './stations/controllers/station-elements.controller';
import { StationFormsController } from './stations/controllers/station-forms.controller';
import { StationFormsService } from './stations/services/station-forms.service';
import { StationObservationEnvironmentEntity } from './stations/entities/station-observation-environment.entity';
import { StationObservationFocusEntity } from './stations/entities/station-observation-focus.entity';
import { StationObsEnvsController } from './stations/controllers/station-obs-envs.controller';
import { StationObsEnvService } from './stations/services/station-obs-env.service';
import { StationObsFocusesService } from './stations/services/station-obs-focuses.service';
import { StationObsFocusesController } from './stations/controllers/station-obs-focuses.controller';
import { ElementTypesController } from './elements/controllers/elements-types.controller';
import { ElementSubdomainsController } from './elements/controllers/elements-subdomains.controller';
import { SourcesService } from './sources/services/sources.service';
import { RegionEntity } from './regions/entities/region.entity';
import { SourceEntity } from './sources/entities/source.entity';
import { ElementsService } from './elements/services/elements.service';
import { QCTestEntity } from './elements/entities/qc-test.entity';
import { QCTestsController } from './elements/controllers/qc-tests.controller';
import { QCTestsService } from './elements/services/qc-tests.service'; 
import { RegionsController } from './regions/controllers/regions.controller';
import { RegionsService } from './regions/services/regions.service';
import { SharedModule } from 'src/shared/shared.module';
import { OrganisationEntity } from './stations/entities/organisation.entity';
import { NetworkAffiliationEntity } from './stations/entities/network-affiliation.entity';
import { StationsImportExportService } from './stations/services/stations-import-export.service';
import { StationNetworkAffiliationEntity } from './stations/entities/station-network-affiliation.entity';
import { MetadataUpdatesController } from './metadata-updates/metadata-updates.controller';
import { ElementTypesService } from './elements/services/element-types.service';
import { ElementSubdomainsService } from './elements/services/element-subdomains.service';
import { ElementsImportExportService } from './elements/services/elements-import-export.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
        ElementSubdomainEntity,
        ElementTypeEntity,
        ElementEntity,
        SourceEntity,
        InstrumentTypeEntity,
        InstrumentEntity,
        OrganisationEntity,
        NetworkAffiliationEntity,
        RegionEntity,
        StationObservationEnvironmentEntity,
        StationObservationFocusEntity,
        StationEntity,
        StationElementEntity,
        StationFormEntity,
        StationNetworkAffiliationEntity,
        QCTestEntity,
    ]),
        SharedModule,
        UserModule,
    ],
    controllers: [
        ElementsController,
        ElementTypesController,
        ElementSubdomainsController,
        SourcesController,
        StationObsEnvsController,
        StationObsFocusesController,
        StationsController,
        StationElementsController,
        StationFormsController,
        QCTestsController,
        RegionsController,
        MetadataUpdatesController,
    ],
    providers: [
        ElementSubdomainsService,
        ElementTypesService,
        ElementsService,
        SourcesService,
        StationObsEnvService,
        StationObsFocusesService,
        StationsService,
        StationElementsService,
        StationFormsService,
        QCTestsService,
        RegionsService, 
        StationsImportExportService,
        ElementsImportExportService,
    ],

    exports: [
        ElementSubdomainsService,
        ElementTypesService,
        ElementsService,
        SourcesService,
        StationObsEnvService,
        StationObsFocusesService,
        StationsService,
        StationElementsService,
        StationFormsService,
        QCTestsService,
        RegionsService,
    ]
})
export class MetadataModule { }
