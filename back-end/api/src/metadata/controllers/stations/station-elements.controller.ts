import { Body, Controller, Delete, Get, Param, ParseArrayPipe, ParseIntPipe, Post, Req } from '@nestjs/common';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { StationElementsService } from '../../services/stations/station-elements.service';
import { StationElementLimit } from '../../entities/stations/station-element.entity';

@Controller('station-elements')
export class StationElementsController {

  constructor(private readonly stationsService: StationElementsService) { }

  @Get('elements/:id')
  getElements(@Param('id', AuthorisedStationsPipe) id: string) {
    return this.stationsService.findElements(id);
  }

  @Admin()
  @Post('elements/:id')
  saveElements(
    @Req() request: Request,
    @Param('id', AuthorisedStationsPipe) stationId: string,
    @Body(new ParseArrayPipe({ items: Number })) elementIds: number[]) {
    return this.stationsService.saveElements(stationId, elementIds, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete('elements/:id')
  deleteElements(
    @Param('id', AuthorisedStationsPipe) stationId: string,
    @Body(new ParseArrayPipe({ items: Number })) elementIds: number[]) {
    return this.stationsService.deleteElements(stationId, elementIds);
  }

  @Get('element-limits/:stationId/:elementId/')
  findElementLimits(
    @Param('stationId', AuthorisedStationsPipe) stationId: string,
    @Param('elementId', ParseIntPipe) elementId: number) {
    return this.stationsService.findStationElementLimits(stationId, elementId);
  }

  @Admin()
  @Post('element-limits/:stationId/:elementId')
  saveElementLimits(@Req() request: Request,
    @Param('stationId', AuthorisedStationsPipe) stationId: string,
    @Param('elementId', ParseIntPipe) elementId: number,
    @Body() limits: StationElementLimit[]) {
    console.log("TODO, limit should be valid dto: ", limits);
    return this.stationsService.saveElementLimit(stationId, elementId, limits, AuthUtil.getLoggedInUserId(request));
  }

}
