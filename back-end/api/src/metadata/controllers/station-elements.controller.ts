import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { StationElementsService } from '../services/station-element';
import { StationElementLimit } from '../entities/station-element.entity';

@Controller('station-elements')
export class StationElementsController {

  constructor(private readonly stationsService: StationElementsService) { }

  @Get('elements/:id')
  getElements(@Param('id', AuthorisedStationsPipe) id: string) {
    return this.stationsService.findElements(id);
  }

  @Admin()
  @Post('elements/:id')
  saveElements(@Req() request: Request, @Param('id', AuthorisedStationsPipe) stationId: string, @Body() elementIds: number[]) {
    return this.stationsService.saveElements(stationId, elementIds, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete('elements/:id')
  deleteElement(@Param('id', AuthorisedStationsPipe) stationId: string, @Body() elementIds: number[]) {
    return this.stationsService.deleteElements(stationId, elementIds);
  }

  @Get('element-limits/:stationId/:elementId/')
  findElementLimits(@Param('stationId', AuthorisedStationsPipe) stationId: string, @Param('elementId') elementId: number) {
    return this.stationsService.findStationElementLimits(stationId, elementId);
  }

  @Admin()
  @Post('element-limits/:stationId/:elementId')
  saveElementLimits(@Req() request: Request,
    @Param('stationId', AuthorisedStationsPipe) stationId: string,
    @Param('elementId') elementId: number,
    @Body() limits: StationElementLimit[]) {
    return this.stationsService.saveElementLimit(stationId, elementId, limits, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete('element-limits/:stationId/:elementId/:monthId')
  deleteElementLimit(@Param('stationId') stationId: string, @Param('elementId') elementId: number, @Param('monthId') monthId: number) {
    // return this.stationsService.deleteElementLimit(stationId, elementId, monthId);
  }




}
