import { Controller, Get, Query, Req } from '@nestjs/common';
import { AuthUtil } from 'src/user/services/auth.util';
import { Request } from 'express';
import { StationsService } from '../stations/services/stations.service';
import { MetadataUpdatesQueryDto } from './dtos/metadata-updates-query.dto';
import { StationObsEnvService } from '../stations/services/station-obs-env.service';
import { StationObsFocusesService } from '../stations/services/station-obs-focuses.service';
import { SourceTemplatesService } from '../source-templates/services/source-templates.service';
import { ElementsService } from '../elements/services/elements.service';
import { RegionsService } from '../regions/services/regions.service';
import { ElementTypesService } from '../elements/services/element-types.service';
import { ElementSubdomainsService } from '../elements/services/element-subdomains.service';

@Controller('metadata-updates')
export class MetadataUpdatesController {
  constructor(
    private stationsService: StationsService,
    private stationObsEnvservice: StationObsEnvService,
    private stationObsFocuseservice: StationObsFocusesService,
    private sourcesService: SourceTemplatesService,
    private elementSubdomainsService: ElementSubdomainsService,
    private elementTypesService: ElementTypesService,
    private elementsService: ElementsService,
    private regionsService: RegionsService,
  ) { }

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

  @Get('stations')
  async stationUpdates(
    @Req() request: Request,
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    let authorisedStationIds: string[] | null = null;
    const user = AuthUtil.getLoggedInUser(request);
    if (user.permissions) {
      authorisedStationIds = [];
      if (user.permissions.entryPermissions && user.permissions.entryPermissions.stationIds) {
        authorisedStationIds.push(...user.permissions.entryPermissions.stationIds);
      }

      if (user.permissions.qcPermissions && user.permissions.qcPermissions.stationIds) {
        authorisedStationIds.push(...user.permissions.qcPermissions.stationIds);
      }

      if (user.permissions.ingestionAnalysisPermissions && user.permissions.ingestionAnalysisPermissions.stationIds) {
        authorisedStationIds.push(...user.permissions.ingestionAnalysisPermissions.stationIds);
      }

      if (user.permissions.stationsMetadataPermissions && user.permissions.stationsMetadataPermissions.stationIds) {
        authorisedStationIds.push(...user.permissions.stationsMetadataPermissions.stationIds);
      }

      // Get distinct station ids
      authorisedStationIds = Array.from(new Set(authorisedStationIds));
    }

    return this.stationsService.checkUpdates(updatesQueryDto, authorisedStationIds);
  }

  @Get('element-subdomains')
  async elementSubdomainsUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    return this.elementSubdomainsService.checkUpdates(updatesQueryDto);
  }

  @Get('element-types')
  async elementTypesUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    return this.elementTypesService.checkUpdates(updatesQueryDto);
  }

  @Get('elements')
  async elementUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    return this.elementsService.checkUpdates(updatesQueryDto);
  }

  @Get('sources')
  async sourcesUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    return this.sourcesService.checkUpdates(updatesQueryDto);
  }

  @Get('regions')
  async regionsUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    return this.regionsService.checkUpdates(updatesQueryDto);
  }

}
