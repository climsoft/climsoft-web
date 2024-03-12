import { Body, Controller, Get, Param, ParseArrayPipe, Post, Query, Req } from '@nestjs/common';
import { StationsService } from '../services/stations.service';
import { CreateStationDto } from '../dtos/create-station.dto';
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
    @Body(new ParseArrayPipe({ items: CreateStationDto })) stationDto: CreateStationDto[]) {
    return this.stationsService.saveStations(stationDto, AuthUtil.getLoggedInUserId(request));
  }

}
