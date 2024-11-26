import { Controller, Get, Query, Req } from '@nestjs/common';
import { AuthUtil } from 'src/user/services/auth.util';
import { Request } from 'express';
import { StationsService } from '../stations/services/stations.service';
import { MetadataUpdatesQueryDto } from './dtos/metadata-updates-query.dto';
import { StationObsEnvService } from '../stations/services/station-obs-env.service';
import { StationObsFocusesService } from '../stations/services/station-obs-focuses.service';
import { SourcesService } from '../sources/services/sources.service';

@Controller('metadata-updates')
export class MetadataUpdatesController {
  constructor(
    private stationsService: StationsService,
    private stationObsEnvservice: StationObsEnvService,
    private stationObsFocuseservice: StationObsFocusesService,
    private sourcesService: SourcesService,
  ) { }

  @Get('stations')
  async stationUpdates(
    @Req() request: Request,
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    const authorisedStationIds = AuthUtil.getLoggedInUser(request).authorisedStationIds;
    return this.stationsService.checkUpdates(
      updatesQueryDto,
      authorisedStationIds ? authorisedStationIds : undefined);
  }

  @Get('station-observation-environments')
  async staionObsEnvironmentUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    return this.stationObsEnvservice.checkUpdates(updatesQueryDto);
  }

  @Get('station-observation-focuses')
  async staionObsFocusesUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    return this.stationObsFocuseservice.checkUpdates(updatesQueryDto);
  }

  @Get('elements')
  async elementUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {

    // return this.stationsService.findUpdatedStations(
    //   updatesQueryDto,
    //   authorisedStationIds ? authorisedStationIds : undefined);
  }

  @Get('sources')
  async sourcesUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    return this.sourcesService.checkUpdates(updatesQueryDto);
  }


}
