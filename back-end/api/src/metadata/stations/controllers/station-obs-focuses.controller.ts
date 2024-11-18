import { Controller, Get, Query, ParseArrayPipe, DefaultValuePipe } from '@nestjs/common';
import { StationObsFocusesService } from '../services/station-obs-focuses.service';
import { DateQueryDto } from 'src/shared/dtos/date-query.dto';


@Controller("station-observation-focuses")
export class StationObsFocusesController {

  constructor(private readonly stationObsFocuseservice: StationObsFocusesService) { }

  @Get()
  public find(
    @Query("ids",
      new DefaultValuePipe([]),
      new ParseArrayPipe({ items: Number, separator: "," })) ids: number[]) {
    return this.stationObsFocuseservice.find(ids);
  }

  @Get('updates')
  async updates(
    @Query() dateQueryDto: DateQueryDto) {
    return this.stationObsFocuseservice.findUpdated( dateQueryDto.date);
  }


}
