import { Body, Controller, Delete, Get, Param, ParseArrayPipe, Post, Req } from '@nestjs/common';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { StationFormsService } from '../services/station-forms.service';

@Controller('station-forms')
export class StationFormsController {

  constructor(private readonly stationFormsService: StationFormsService) { }

  @Get(':id')
  getForms(@Param('id', AuthorisedStationsPipe) id: string) {
    return this.stationFormsService.find(id);
  }

  @Admin()
  @Post(':id')
  saveForms(
    @Req() request: Request,
    @Param('id', AuthorisedStationsPipe) stationId: string,
    @Body(new ParseArrayPipe({ items: Number })) formIds: number[]) {
    return this.stationFormsService.save(stationId, formIds, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete(':id')
  deleteForms(
    @Param('id', AuthorisedStationsPipe) stationId: string,
    @Body(new ParseArrayPipe({ items: Number })) elementIds: number[]) {
    return this.stationFormsService.delete(stationId, elementIds);
  }


}
