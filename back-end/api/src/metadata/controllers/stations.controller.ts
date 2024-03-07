import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { StationsService } from '../services/stations.service';
import { CreateStationDto } from '../dtos/create-station.dto'; 
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { LoggedInUserDto } from 'src/user/dtos/logged-in-user.dto';
import { AuthUtil } from 'src/user/services/auth.util';

@Controller('stations')
export class StationsController {

  constructor(private readonly stationsService: StationsService) { }

  @Get()
  getStations(@Query('ids', AuthorisedStationsPipe) ids: string[]) {
    return this.stationsService.findStations(ids);
  }

  @Get(':id')
  getCharacteristics(@Param('id', AuthorisedStationsPipe) id: string) {
    return this.stationsService.findStation(id);
  }

  @Admin()
  @Post()
  saveCharacteristics(@Req() request: Request, @Body() stationDto: CreateStationDto[]) {
    return this.stationsService.saveStations(stationDto, AuthUtil.getLoggedInUserId(request));
  }


  //--------- station forms ----------
  @Get('forms/:id')
  findForms(@Param('id', AuthorisedStationsPipe) id: string) {
    return this.stationsService.findForms(id);
  }

  @Admin()
  @Post('forms/:id')
  saveForms(@Req() request: Request, @Param('id', AuthorisedStationsPipe) stationId: string, @Body() formIds: number[]) {
    return this.stationsService.saveForms(stationId, formIds, ((request.session as any).user as LoggedInUserDto).id);
  }

  @Admin()
  @Delete('forms/:stationId/:formId')
  deleteForm(@Param('stationId', AuthorisedStationsPipe) stationId: string, @Param('formId') formId: number) {
    return this.stationsService.deleteForm(stationId, formId);
  }
  //--------------------------

}
