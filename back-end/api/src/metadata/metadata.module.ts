import { Module } from '@nestjs/common';
import { StationEntity } from './entities/station.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationsController } from './controllers/stations.controller';
import { StationsService } from './services/stations.service';
import { ElementsController } from './controllers/elements.controller';
import { ElementEntity } from './entities/element.entity';
import { ElementsService } from './services/elements.service';
import { SourceEntity } from './entities/source.entity';
import { SourcesService } from 'src/metadata/services/sources.service';
import { SourcesController } from 'src/metadata/controllers/sources.controller';
import { StationElementEntity } from './entities/station-element.entity';
import { StationFormEntity } from './entities/station-form.entity';
import { InstrumentEntity } from './entities/instrument.entity';
import { InstrumentTypeEntity } from './entities/instrument-type.entity';
import { ElementSubdomainEntity } from './entities/element-subdomain.entity';
import { ElementTypeEntity } from './entities/element-type.entity';
import { UserModule } from 'src/user/user.module';
import { StationElementsService } from './services/station-elements.service';
import { StationElementsController } from './controllers/station-elements.controller';
import { StationFormsController } from './controllers/station-forms.controller';
import { StationFormsService } from './services/station-forms.service';
import { StationObsEnvironmentEntity } from './entities/station-observation-environment.entity';
import { StationObservationFocusEntity } from './entities/station-observation-focus.entity';
import { StationObsEnvsController } from './controllers/station-obs-envs.controller';
import { StationObsEnvService } from './services/station-obs-env.service';
import { StationObsFocusesService } from './services/station-obs-focuses.service';
import { StationObsFocusesController } from './controllers/station-obs-focuses.controller';
import { ElementTypesController } from './controllers/elements-types.controller';
import { ElementSubdomainsController } from './controllers/elements-subdomains.controller';

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
        StationObsEnvsController,
        StationObsFocusesController,
        StationsController,
        StationElementsController,
        StationFormsController,],
    providers: [
        ElementsService,
        SourcesService,
        StationObsEnvService,
        StationObsFocusesService,
        StationsService,
        StationElementsService,
        StationFormsService],
    // TODO. Check if these need to be exported
    exports: [
        ElementsService, 
        SourcesService,
        StationObsEnvService,
        StationObsFocusesService,
        StationsService,
        StationElementsService,
        StationFormsService]
})
export class MetadataModule { }
