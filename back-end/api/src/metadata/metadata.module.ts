import { Module } from '@nestjs/common';
import { StationEntity } from './entities/station.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationsController } from './controllers/stations.controller';
import { StationsService } from './services/stations.service';
import { ElementsController } from './controllers/elements.controller';
import { ElementEntity } from './entities/element.entity';
import { ElementsService } from './services/elements.service';
import { SourceTypeEntity } from './entities/source-types.entity';
import { SourceEntity } from './entities/source.entity';
import { SourcesService } from 'src/metadata/services/sources.service';
import { SourcesController } from 'src/metadata/controllers/sources.controller';
import { StationElementEntity } from './entities/station-element.entity';
import { StationFormEntity } from './entities/station-form.entity';
import { InstrumentEntity } from './entities/instrument.entity';
import { InstrumentTypeEntity } from './entities/instrument-type.entity';

@Module({
    imports: [TypeOrmModule.forFeature([
        SourceTypeEntity,
        SourceEntity,
        StationEntity,
        ElementEntity,
        InstrumentTypeEntity,
        InstrumentEntity,
        StationElementEntity,
        StationFormEntity,
    ])],
    controllers: [SourcesController, StationsController, ElementsController],
    providers: [SourcesService, StationsService, ElementsService],
})
export class MetadataModule { }
