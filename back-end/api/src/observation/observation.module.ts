import { Module } from '@nestjs/common';
import { ObservationsController } from './observations.controller';
import { ObservationsService } from './observations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservationEntity } from './observation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ObservationEntity])],
  controllers: [ObservationsController],
  providers: [ObservationsService]
})
export class ObservationModule {}
