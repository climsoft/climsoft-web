import { Controller, Get, Query, ParseArrayPipe, DefaultValuePipe } from '@nestjs/common';

import { StationObsEnvService } from '../services/station-obs-env.service';

@Controller("station-observation-environments")
export class StationObsEnvsController {

  constructor(private readonly stationObsEnvservice: StationObsEnvService) { }

  @Get()
  public find(
    @Query("ids",
      new DefaultValuePipe([]),
      new ParseArrayPipe({ items: Number, separator: "," })) ids: number[]) {
    return this.stationObsEnvservice.find(ids);
  }



}
