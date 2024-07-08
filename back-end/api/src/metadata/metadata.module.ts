import { Module } from '@nestjs/common';
import { StationEntity } from './entities/stations/station.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationsController } from './controllers/stations/stations.controller';
import { StationsService } from './services/stations/stations.service';
import { ElementsController } from './controllers/elements/elements.controller';
import { ElementEntity } from './entities/elements/element.entity';
import { ElementsService } from './services/elements/elements.service';
import { SourceEntity } from './entities/sources/source.entity'; 
import { SourcesController } from 'src/metadata/controllers/sources/controllers/sources.controller';
import { StationElementEntity } from './entities/stations/station-element.entity';
import { StationFormEntity } from './entities/stations/station-form.entity';
import { InstrumentEntity } from './entities/instruments/instrument.entity';
import { InstrumentTypeEntity } from './entities/instruments/instrument-type.entity';
import { ElementSubdomainEntity } from './entities/elements/element-subdomain.entity';
import { ElementTypeEntity } from './entities/elements/element-type.entity';
import { UserModule } from 'src/user/user.module';
import { StationElementsService } from './services/stations/station-elements.service';
import { StationElementsController } from './controllers/stations/station-elements.controller';
import { StationFormsController } from './controllers/stations/station-forms.controller';
import { StationFormsService } from './services/stations/station-forms.service';
import { StationObsEnvironmentEntity } from './entities/stations/station-observation-environment.entity';
import { StationObservationFocusEntity } from './entities/stations/station-observation-focus.entity';
import { StationObsEnvsController } from './controllers/stations/station-obs-envs.controller';
import { StationObsEnvService } from './services/stations/station-obs-env.service';
import { StationObsFocusesService } from './services/stations/station-obs-focuses.service';
import { StationObsFocusesController } from './controllers/stations/station-obs-focuses.controller';
import { ElementTypesController } from './controllers/elements/elements-types.controller';
import { ElementSubdomainsController } from './controllers/elements/elements-subdomains.controller';
import { FormSourcesController } from './controllers/sources/controllers/form-sources.controller';
import { FormSourcesService } from './controllers/sources/services/form-sources.service';
import { SourcesService } from './controllers/sources/services/sources.service';
import { ImportSourcesService } from './controllers/sources/services/import-sources.service';
import { ImportSourcesController } from './controllers/sources/controllers/import-sources.controller';

@Module({
    imports: [TypeOrmModule.forFeature([
        ElementSubdomainEntity,
        ElementTypeEntity,
        ElementEntity,
        SourceEntity,
        InstrumentTypeEntity,
        InstrumentEntity,
        StationObsEnvironmentEntity,
        StationObservationFocusEntity,
        StationEntity,
        StationElementEntity,
        StationFormEntity,
    ]), UserModule],
    controllers: [
        ElementsController,
        ElementTypesController,
        ElementSubdomainsController,
        SourcesController,
        FormSourcesController,
        ImportSourcesController,
        ImportSourcesController,
        StationObsEnvsController,
        StationObsFocusesController,
        StationsController,
        StationElementsController,
        StationFormsController,],
    providers: [
        ElementsService,
        SourcesService,
        FormSourcesService,
        ImportSourcesService,
        StationObsEnvService,
        StationObsFocusesService,
        StationsService,
        StationElementsService,
        StationFormsService],

    // TODO. Check if these need to be exported
    exports: [
        ElementsService, 
        SourcesService,
        FormSourcesService,
        ImportSourcesService,
        StationObsEnvService,
        StationObsFocusesService,
        StationsService,
        StationElementsService,
        StationFormsService]
})
export class MetadataModule { }
