import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { StationsService } from '../services/stations.service';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { UpdateStationDto } from '../dtos/update-station.dto';
import { CreateStationDto } from '../dtos/create-update-station.dto';
import { ViewStationDto } from '../dtos/view-station.dto';
import { ViewStationQueryDTO } from '../dtos/view-station-query.dto';
import { Admin } from 'src/user/decorators/admin.decorator';
import { AuthUtil } from 'src/user/services/auth.util';
import { Request } from 'express';

@Controller('stations')
export class StationsController {

  constructor(private readonly stationsService: StationsService) { }

  @Get()
  find(
    //@Query('ids', AuthorisedStationsPipe) ids: string[],
    @Query(AuthorisedStationsPipe) viewQueryDto: ViewStationQueryDTO): Promise<ViewStationDto[]> {
    return this.stationsService.find(viewQueryDto);
  }

  @Get('id/:id')
  findOne(
    @Param('id', AuthorisedStationsPipe) id: string): Promise<ViewStationDto> {
    return this.stationsService.findOne(id);
  }

  @Get('count')
  count(@Query() viewQueryDto: ViewStationQueryDTO) {
    return this.stationsService.count(viewQueryDto);
  }

  @Admin()
  @Post()
  async create(
    @Req() request: Request,
    @Body() item: CreateStationDto): Promise<ViewStationDto> {
    return this.stationsService.create(item, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() item: UpdateStationDto): Promise<ViewStationDto> {
    return this.stationsService.update(id, item, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete(':id')
  async delete(
    @Param('id') id: string): Promise<string> {
    return this.stationsService.delete(id);
  }


}
