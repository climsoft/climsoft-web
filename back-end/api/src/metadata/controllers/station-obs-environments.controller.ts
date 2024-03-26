import { Controller, Get, Query, ParseArrayPipe, DefaultValuePipe } from '@nestjs/common';

import { StationObsEnvironmentsService } from '../services/station-obs-environments.service';

@Controller("station-observation-environments")
export class StationObsEnvironmentsController {

  constructor(private readonly stationObsEnvservice: StationObsEnvironmentsService) { }

  @Get()
  public find(
    @Query("ids",
      new DefaultValuePipe([]),
      new ParseArrayPipe({ items: Number, separator: "," })) ids: number[]) {
    return this.stationObsEnvservice.find(ids);
  }



}
