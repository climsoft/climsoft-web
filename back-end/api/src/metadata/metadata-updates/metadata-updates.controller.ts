import { BadRequestException, Controller, Get, Query, Req } from '@nestjs/common';
import { AuthUtil } from 'src/user/services/auth.util';
import { Request } from 'express';
import { StationsService } from '../stations/services/stations.service';
import { MetadataUpdatesQueryDto } from './dtos/metadata-updates-query.dto';
import { StationObsEnvService } from '../stations/services/station-obs-env.service';
import { StationObsFocusesService } from '../stations/services/station-obs-focuses.service';
import { SourceSpecificationsService } from '../source-templates/services/source-specifications.service';
import { ElementsService } from '../elements/services/elements.service';
import { RegionsService } from '../regions/services/regions.service';
import { ElementTypesService } from '../elements/services/element-types.service';
import { ElementSubdomainsService } from '../elements/services/element-subdomains.service';
import { OrganisationsService } from '../organisations/services/organisations.service';
import { NetworkAffiliationsService } from '../network-affiliations/services/network-affiliations.service';
import { QCSpecificationsService } from '../qc-specifications/services/qc-specifications.service';
import { GeneralSettingsService } from 'src/settings/services/general-settings.service';

// TODO. Move this controller to a module responsible for handling cached data

@Controller('metadata-updates')
export class MetadataUpdatesController {
  constructor(
    private organisationsService: OrganisationsService,
    private networkAffiliationsService: NetworkAffiliationsService,
    private regionsService: RegionsService,
    private stationsService: StationsService,
    private stationObsEnvservice: StationObsEnvService,
    private stationObsFocuseservice: StationObsFocusesService,
    private sourceTemplatesService: SourceSpecificationsService,
    private elementSubdomainsService: ElementSubdomainsService,
    private elementTypesService: ElementTypesService,
    private elementsService: ElementsService,
    private qcTestsService: QCSpecificationsService,
    private generalSettingsService: GeneralSettingsService,
  ) { }

  @Get('organisations')
  async organisationsUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    return this.organisationsService.checkUpdates(updatesQueryDto);
  }

  @Get('network-affiliations')
  async networkAffiliationsUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    return this.networkAffiliationsService.checkUpdates(updatesQueryDto);
  }

  @Get('regions')
  async regionsUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    return this.regionsService.checkUpdates(updatesQueryDto);
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

  @Get('stations')
  async stationUpdates(
    @Req() request: Request,
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    // Important. Only send updates from stations that the user is authorised to access
    let authorisedStationIds: string[] | null;
    const user = AuthUtil.getLoggedInUser(request);
    if (user.isSystemAdmin) {
      authorisedStationIds = null;
    } else if (user.permissions) {
      authorisedStationIds = [];
      if (user.permissions.entryPermissions && user.permissions.entryPermissions.stationIds) {
        authorisedStationIds.push(...user.permissions.entryPermissions.stationIds);
      }

      if (user.permissions.qcPermissions && user.permissions.qcPermissions.stationIds) {
        authorisedStationIds.push(...user.permissions.qcPermissions.stationIds);
      }

      if (user.permissions.ingestionMonitoringPermissions && user.permissions.ingestionMonitoringPermissions.stationIds) {
        authorisedStationIds.push(...user.permissions.ingestionMonitoringPermissions.stationIds);
      }

      if (user.permissions.stationsMetadataPermissions && user.permissions.stationsMetadataPermissions.stationIds) {
        authorisedStationIds.push(...user.permissions.stationsMetadataPermissions.stationIds);
      }

      // Get distinct station ids
      authorisedStationIds = Array.from(new Set(authorisedStationIds));
    } else {
      throw new BadRequestException('User permissions not defined');
    }

    // return this.stationsService.checkUpdates(updatesQueryDto, authorisedStationIds);
    return this.stationsService.checkUpdates(updatesQueryDto);
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

  @Get('qc-specifications')
  async qcTestsUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    return this.qcTestsService.checkUpdates(updatesQueryDto);
  }

  @Get('source-specifications')
  async sourceTemplatesUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    return this.sourceTemplatesService.checkUpdates(updatesQueryDto);
  }

  @Get('general-settings')
  async generalSettingsUpdates(
    @Query() updatesQueryDto: MetadataUpdatesQueryDto) {
    return this.generalSettingsService.checkUpdates(updatesQueryDto);
  }

}
