import { Body, Controller, Delete, Get, Param, ParseArrayPipe, ParseIntPipe, Put, Req } from '@nestjs/common';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { StationFormsService } from '../services/station-forms.service';

@Controller('station-forms')
export class StationFormsController {

  constructor(private readonly stationFormsService: StationFormsService) { }

  @Get('stations-count-per-form')
  public getStationCountPerForm() {
    return this.stationFormsService.getStationCountPerForm();
  }

  @Get('forms-assigned-to-station/:id')
  public getFormsAssignedToStation(@Param('id') stationId: string) {
    return this.stationFormsService.getFormsAssignedToStation(stationId);
  }

  @Get('stations-assigned-to-use-form/:id')
  public getStationsAssignedToUseForm(@Param('id', ParseIntPipe) formId: number) {
    return this.stationFormsService.getStationsAssignedToUseForm(formId);
  }

  @Put('forms-assigned-to-station/:id')
  public putFormsAssignedToStation(
    @Req() request: Request,
    @Param('id', AuthorisedStationsPipe) stationId: string,
    @Body(new ParseArrayPipe({ items: Number })) formIds: number[]) {
    return this.stationFormsService.putFormsAssignedToStation(stationId, formIds, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete('forms-assigned-to-station/:id')
  public async deleteFormsAsignedToStation(
    @Param('id', AuthorisedStationsPipe) stationId: string) {
    await this.stationFormsService.deleteFormsAsignedToStation(stationId);
    return { message: 'success' };
  }

  @Admin()
  @Put('stations-assigned-to-use-form/:id')
  public putStationsAssignedToUseForm(
    @Req() request: Request,
    @Param('id', ParseIntPipe) formId: number,
    @Body(new ParseArrayPipe({ items: String })) stationIds: string[]) {
    return this.stationFormsService.putStationsAssignedToUseForm(formId, stationIds, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete('stations-assigned-to-use-form/:id')
  public async deleteStationsAssignedToUseForm(
    @Param('id') formId: number) {
    await this.stationFormsService.deleteStationsAssignedToUseForm(formId);
    return { message: 'success' };
  }


}
