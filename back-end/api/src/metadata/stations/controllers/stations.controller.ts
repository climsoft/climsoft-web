import { Controller, Get, Param, Query } from '@nestjs/common';
import { StationsService } from '../services/stations.service'; 
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe'; 
import { BaseStringController } from 'src/shared/controllers/base-string.controller';
import { UpdateStationDto } from '../dtos/update-station.dto';
import { CreateStationDto } from '../dtos/create-update-station.dto';
import { ViewStationDto } from '../dtos/view-station.dto';

@Controller('stations')
export class StationsController extends BaseStringController<CreateStationDto, UpdateStationDto, ViewStationDto> {

  constructor(private readonly stationsService: StationsService) {
    super(stationsService);
  }

  @Get()
  find(
    @Query('ids', AuthorisedStationsPipe) ids: string[]): Promise<ViewStationDto[]> {
    if (ids && ids.length > 0) {
      return this.stationsService.findSome(ids);
    }

    return this.stationsService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', AuthorisedStationsPipe) id: string): Promise<ViewStationDto> {
    return this.stationsService.findOne(id);
  }


}
