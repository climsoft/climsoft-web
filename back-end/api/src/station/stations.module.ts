import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Station } from './entities/station.entity';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';

@Module({    
  imports: [TypeOrmModule.forFeature([Station])],
  controllers: [StationsController],
  providers: [StationsService],
})
export class StationsModule {}
