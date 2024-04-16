import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { StationsService } from '../../services/stations/stations.service';
import { CreateUpdateStationDto } from '../../dtos/stations/create-update-station.dto';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';

@Controller('stations')
export class StationsController {

  constructor(private readonly stationsService: StationsService) { }

  @Get()
  getStations(
    @Query('ids', AuthorisedStationsPipe) ids: string[]) {
    return this.stationsService.findStations(ids);
  }

  @Get(':id')
  getCharacteristics(
    @Param('id', AuthorisedStationsPipe) id: string) {
    return this.stationsService.findStation(id);
  }

  @Admin()
  @Post()
  saveCharacteristics(
    @Req() request: Request,
    @Body() stationDto: CreateUpdateStationDto) {
    return this.stationsService.saveStation(stationDto, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete(':id')
  public delete(@Param('id') id: string) {
      return this.stationsService.deleteStation(id);
  }

}
