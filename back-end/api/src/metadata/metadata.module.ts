import { Module } from '@nestjs/common';
import { StationEntity } from './stations/entities/station.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationsController } from './stations/controllers/stations.controller';
import { StationsService } from './stations/services/stations.service';
import { ElementsController } from './elements/controllers/elements.controller';
import { ElementEntity } from './elements/entities/element.entity';
import { SourceTemplatesController } from 'src/metadata/source-templates/controllers/source-templates.controller';
import { StationFormEntity } from './stations/entities/station-form.entity';
import { ElementSubdomainEntity } from './elements/entities/element-subdomain.entity';
import { ElementTypeEntity } from './elements/entities/element-type.entity';
import { UserModule } from 'src/user/user.module';
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
import { SourceTemplatesService } from './source-templates/services/source-templates.service';
import { SourceTemplateEntity } from './source-templates/entities/source-template.entity';
import { ElementsService } from './elements/services/elements.service';
import { ElementQCTestEntity } from './elements/entities/element-qc-test.entity';
import { ElementsQCTestsController } from './elements/controllers/elements-qc-tests.controller';
import { ElementsQCTestsService } from './elements/services/elements-qc-tests.service';
import { RegionsController } from './regions/controllers/regions.controller';
import { RegionsService } from './regions/services/regions.service';
import { SharedModule } from 'src/shared/shared.module';
import { OrganisationEntity } from './organisations/entities/organisation.entity';
import { NetworkAffiliationEntity } from './network-affiliations/entities/network-affiliation.entity';
import { StationsImportExportService } from './stations/services/stations-import-export.service';
import { StationNetworkAffiliationEntity } from './stations/entities/station-network-affiliation.entity';
import { MetadataUpdatesController } from './metadata-updates/metadata-updates.controller';
import { ElementTypesService } from './elements/services/element-types.service';
import { ElementSubdomainsService } from './elements/services/element-subdomains.service';
import { ElementsImportExportService } from './elements/services/elements-import-export.service';
import { ExportTemplateEntity } from './export-templates/entities/export-template.entity';
import { ExportTemplatesController } from './export-templates/controllers/export-templates.controller';
import { ExportTemplatesService } from './export-templates/services/export-templates.service';
import { OrganisationsController } from './organisations/controllers/organisations.controller';
import { OrganisationsService } from './organisations/services/organisations.service';
import { RegionEntity } from './regions/entities/region.entity';
import { NetworkAffiliationsController } from './network-affiliations/controllers/network-affiliation.controller';
import { NetworkAffiliationsService } from './network-affiliations/services/network-affiliations.service';
import { StationNetworkAffiliationsController } from './stations/controllers/station-network-affiliations.controller';
import { StationNetworkAffiliationsService } from './stations/services/station-networks.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ElementSubdomainEntity,
            ElementTypeEntity,
            ElementEntity,
            ElementQCTestEntity,

            OrganisationEntity,
            NetworkAffiliationEntity,
            RegionEntity,
            StationObservationEnvironmentEntity,
            StationObservationFocusEntity,
            StationEntity,
            StationFormEntity,
            StationNetworkAffiliationEntity,

            //InstrumentTypeEntity, // TODO add later
            //InstrumentEntity, // TODO add later

            SourceTemplateEntity,

            ExportTemplateEntity,
        ]),
        SharedModule,
        UserModule,
    ],
    controllers: [
        ElementsController,
        ElementTypesController,
        ElementSubdomainsController,
        ElementsQCTestsController,

        OrganisationsController,
        NetworkAffiliationsController,
        RegionsController,
        StationObsEnvsController,
        StationObsFocusesController,
        StationsController,
        StationFormsController,
        StationNetworkAffiliationsController,

        SourceTemplatesController,

        ExportTemplatesController,

        MetadataUpdatesController,
    ],
    providers: [
        ElementSubdomainsService,
        ElementTypesService,
        ElementsService,
        
        OrganisationsService,
        NetworkAffiliationsService,

        StationObsEnvService,
        StationObsFocusesService,
        StationsService,
        StationFormsService,
        StationNetworkAffiliationsService,


        SourceTemplatesService,

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
        OrganisationsService,
        SourceTemplatesService,
        StationObsEnvService,
        StationObsFocusesService,
        StationsService,
        StationFormsService,
        ElementsQCTestsService,
        RegionsService,
        ExportTemplatesService,

    ]
})
export class MetadataModule { }
