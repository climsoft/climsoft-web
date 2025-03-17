import { Body, Controller, Delete, Get, Param, ParseArrayPipe, ParseIntPipe, Put, Req } from '@nestjs/common';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util'; 
import { StationNetworkAffiliationsService } from '../services/station-networks.service';

@Controller('station-network-affiliations')
export class StationNetworkAffiliationsController {

  constructor(private readonly stationNetworkAffiliationsService: StationNetworkAffiliationsService) { }

  @Admin()
  @Get('stations-count-per-network-affiliation')
  public getStationCountPerForm() {
    return this.stationNetworkAffiliationsService.getStationCountPerNetwork();
  }

  @Get('network-affiliations-assigned-to-station/:id')
  public getFormsAssignedToStation(@Param('id', AuthorisedStationsPipe) stationId: string) {
    return this.stationNetworkAffiliationsService.getNetworksAssignedToStation(stationId);
  }

  @Admin()
  @Get('stations-assigned-to-network-affiliation/:id')
  public getStationsAssignedToUseForm(@Param('id', ParseIntPipe) formId: number) {
    return this.stationNetworkAffiliationsService.getStationsAssignedToNetwork(formId);
  }

  @Admin()
  @Put('network-affiliations-assigned-to-station/:id')
  public putFormsAssignedToStation(
    @Req() request: Request,
    @Param('id') stationId: string,
    @Body(new ParseArrayPipe({ items: Number })) formIds: number[]) {
    return this.stationNetworkAffiliationsService.putNetworksAssignedToStation(stationId, formIds, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete('network-affiliations-assigned-to-station/:id')
  public async deleteFormsAsignedToStation(
    @Param('id') stationId: string) {
    await this.stationNetworkAffiliationsService.deleteNetworksAsignedToStation(stationId);
    return { message: 'success' };
  }

  @Admin()
  @Put('stations-assigned-to-network-affiliation/:id')
  public putStationsAssignedToUseForm(
    @Req() request: Request,
    @Param('id', ParseIntPipe) formId: number,
    @Body(new ParseArrayPipe({ items: String })) stationIds: string[]) {
    return this.stationNetworkAffiliationsService.putStationsAssignedToNetwork(formId, stationIds, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete('stations-assigned-to-network-affiliation/:id')
  public async deleteStationsAssignedToUseForm(
    @Param('id') formId: number) {
    await this.stationNetworkAffiliationsService.deleteStationsAssignedToNetwork(formId);
    return { message: 'success' };
  }


}
