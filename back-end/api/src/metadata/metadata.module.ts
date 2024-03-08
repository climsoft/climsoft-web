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
import { ElementDomainEntity } from './entities/element-domain.entity';
import { ElementSubdomainEntity } from './entities/element-subdomain.entity';
import { ElementTypeEntity } from './entities/element-type.entity';
import { UserModule } from 'src/user/user.module';
import { StationElementsService } from './services/station-element.service';
import { StationElementsController } from './controllers/station-elements.controller';
import { StationFormsController } from './controllers/station-forms.controller';
import { StationFormsService } from './services/station-forms.service';

@Module({
    imports: [TypeOrmModule.forFeature([ 
        SourceEntity,
        StationEntity,
        ElementDomainEntity,
        ElementSubdomainEntity,
        ElementTypeEntity,
        ElementEntity,
        InstrumentTypeEntity,
        InstrumentEntity,
        StationElementEntity,
        StationFormEntity,
    ]), UserModule],
    controllers: [ElementsController, SourcesController, StationsController, StationElementsController, StationFormsController],
    providers: [ElementsService, SourcesService, StationsService, StationElementsService, StationFormsService],
    // TODO. Check if these need to be exported
    exports: [ElementsService, SourcesService, StationsService, StationElementsService, StationFormsService]
})
export class MetadataModule { }
