import { Module } from '@nestjs/common';
import { ObservationsController } from './controllers/observations.controller';
import { ObservationsService } from './services/observations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservationEntity } from './entities/observation.entity';  
import { ObservationImportService } from './services/observation-import.service';
import { MetadataModule } from 'src/metadata/metadata.module'; 
import { UserModule } from 'src/user/user.module';
import { SourceCheckController } from './controllers/source-check.controller';
import { SourceCheckService } from './services/source-check.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([ObservationEntity]), SharedModule, UserModule, MetadataModule],
  controllers: [ObservationsController, SourceCheckController],
  providers: [ObservationsService,  ObservationImportService, SourceCheckService]
})
export class ObservationModule {}
