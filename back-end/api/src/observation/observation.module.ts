import { Module } from '@nestjs/common';
import { ObservationsController } from './controllers/observations.controller';
import { ObservationsService } from './services/observations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservationEntity } from './entities/observation.entity';
import { FlagEntity } from './entities/flag.entity';
import { FlagsController } from './controllers/flags.controller';
import { FlagsService } from './services/flags.service';
import { ObservationUploadService } from './services/observation-upload.service';
import { MetadataModule } from 'src/metadata/metadata.module';

@Module({
  imports: [TypeOrmModule.forFeature([ObservationEntity, FlagEntity]), MetadataModule],
  controllers: [ObservationsController, FlagsController],
  providers: [ObservationsService, FlagsService, ObservationUploadService]
})
export class ObservationModule {}
