import { Module } from '@nestjs/common';
import { ObservationsController } from './observations.controller';
import { ObservationsService } from './observations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservationEntity } from './observation.entity';
import { FlagEntity } from './flag.entity';
import { FlagsController } from './flags.controller';
import { FlagsService } from './flags.service';

@Module({
  imports: [TypeOrmModule.forFeature([ObservationEntity, FlagEntity])],
  controllers: [ObservationsController, FlagsController],
  providers: [ObservationsService, FlagsService]
})
export class ObservationModule {}
