import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseArrayPipe, ParseIntPipe, Put, Query, Req } from '@nestjs/common';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { StationNetworkAffiliationsService } from '../services/station-network-affiliations.service';

@Controller('station-network-affiliations')
export class StationNetworkAffiliationsController {

  constructor(private readonly stationNetworkAffiliationsService: StationNetworkAffiliationsService) { }

  @Get('stations-count-per-network-affiliation')
  public getStationCountPerNetwork() {
    return this.stationNetworkAffiliationsService.getStationCountPerNetwork();
  }

  @Get('stations-assigned-to-network-affiliations')
  public getStationsAssignedToUseForm(
    @Query('networkAffiliationIds',
      new DefaultValuePipe([]),
      new ParseArrayPipe({ items: Number, separator: "," })) networkAffiliationIds: number[]) {
    return this.stationNetworkAffiliationsService.getStationsAssignedToNetworks(networkAffiliationIds);
  }

  @Get('network-affiliations-assigned-to-station/:id')
  public getNetworksAssignedToStation(@Param('id') stationId: string) {
    return this.stationNetworkAffiliationsService.getNetworksAssignedToStation(stationId);
  }

  @Put('network-affiliations-assigned-to-station/:id')
  public putNetworksAssignedToStation(
    @Req() request: Request,
    @Param('id', AuthorisedStationsPipe) stationId: string,
    @Body(new ParseArrayPipe({ items: Number })) formIds: number[]) {
    return this.stationNetworkAffiliationsService.putNetworksAssignedToStation(stationId, formIds, AuthUtil.getLoggedInUserId(request));
  }

  @Delete('network-affiliations-assigned-to-station/:id')
  public async deleteNetworksAsignedToStation(
    @Param('id', AuthorisedStationsPipe) stationId: string) {
    await this.stationNetworkAffiliationsService.deleteNetworksAsignedToStation(stationId);
    return { message: 'success' };
  }

  @Admin()
  @Put('stations-assigned-to-network-affiliation/:id')
  public putStationsAssignedToNetwork(
    @Req() request: Request,
    @Param('id', ParseIntPipe) networkAffiliationId: number,
    @Body(new ParseArrayPipe({ items: String })) stationIds: string[]) {
    return this.stationNetworkAffiliationsService.putStationsAssignedToNetwork(networkAffiliationId, stationIds, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete('stations-assigned-to-network-affiliation/:id')
  public async deleteStationsAssignedToNetwork(
    @Param('id') networkAffiliationId: number) {
    await this.stationNetworkAffiliationsService.deleteStationsAssignedToNetwork(networkAffiliationId);
    return { message: 'success' };
  }


}
