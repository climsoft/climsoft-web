import { Module } from '@nestjs/common';
import { StationEntity } from './stations/entities/station.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationsController } from './stations/controllers/stations.controller';
import { StationsService } from './stations/services/stations.service';
import { ElementsController } from './elements/controllers/elements.controller';
import { ElementEntity } from './elements/entities/element.entity';
import { SourceTemplatesController } from 'src/metadata/sources/controllers/source-templates.controller';
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
import { SourceTemplatesService } from './sources/services/source-templates.service';
import { RegionEntity } from './regions/entities/region.entity';
import { SourceTemplateEntity } from './sources/entities/source-template.entity';
import { ElementsService } from './elements/services/elements.service';
import { ElementQCTestEntity } from './elements/entities/element-qc-test.entity';
import { ElementsQCTestsController } from './elements/controllers/elements-qc-tests.controller';
import { ElementsQCTestsService } from './elements/services/elements-qc-tests.service'; 
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
import { ExportTemplateEntity } from './exports/entities/export-template.entity';
import { ExportTemplatesController } from './exports/controllers/export-templates.controller';
import { ExportTemplatesService } from './exports/services/export-templates.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
        ElementSubdomainEntity,
        ElementTypeEntity,
        ElementEntity,
        SourceTemplateEntity,
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
        ElementQCTestEntity,
        ExportTemplateEntity,
    ]),
        SharedModule,
        UserModule,
    ],
    controllers: [
        ElementsController,
        ElementTypesController,
        ElementSubdomainsController,
        SourceTemplatesController,
        StationObsEnvsController,
        StationObsFocusesController,
        StationsController,
        StationElementsController,
        StationFormsController,
        ElementsQCTestsController,
        RegionsController,
        ExportTemplatesController,
        MetadataUpdatesController,
    ],
    providers: [
        ElementSubdomainsService,
        ElementTypesService,
        ElementsService,
        SourceTemplatesService,
        StationObsEnvService,
        StationObsFocusesService,
        StationsService,
        StationElementsService,
        StationFormsService,
        ElementsQCTestsService,
        RegionsService, 
        StationsImportExportService,
        ElementsImportExportService,
        ExportTemplatesService,
    ],

    exports: [
        ElementSubdomainsService,
        ElementTypesService,
        ElementsService,
        SourceTemplatesService,
        StationObsEnvService,
        StationObsFocusesService,
        StationsService,
        StationElementsService,
        StationFormsService,
        ElementsQCTestsService,
        RegionsService,
        ExportTemplatesService,
    ]
})
export class MetadataModule { }
