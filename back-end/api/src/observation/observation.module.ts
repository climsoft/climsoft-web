import { Module } from '@nestjs/common';
import { ObservationsController } from './controllers/observations.controller';
import { ObservationsService } from './services/observations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservationEntity } from './entities/observation.entity'; 
import { FlagsService } from './services/flags.service';
import { ObservationUploadService } from './services/observation-upload.service';
import { MetadataModule } from 'src/metadata/metadata.module'; 
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([ObservationEntity]),  UserModule, MetadataModule],
  controllers: [ObservationsController],
  providers: [ObservationsService, FlagsService, ObservationUploadService]
})
export class ObservationModule {}
