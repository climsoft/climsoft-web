import { Controller, Get, Param, Query } from '@nestjs/common';
import { StationsService } from '../../services/stations/stations.service';
import { CreateStationDto } from '../../dtos/stations/create-update-station.dto';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { ViewStationDto } from 'src/metadata/dtos/stations/view-station.dto';
import { UpdateStationDto } from 'src/metadata/dtos/stations/update-station.dto';
import { BaseStringController } from 'src/shared/controllers/base-string.controller';

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

  // @Admin()
  // @Post()
  // saveCharacteristics(
  //   @Req() request: Request,
  //   @Body() stationDto: CreateStationDto) {
  //   return this.stationsService.create(stationDto, AuthUtil.getLoggedInUserId(request));
  // }

  // @Admin()
  // @Delete(':id')
  // public delete(@Param('id') id: string) {
  //     return this.stationsService.delete(id);
  // }

}
