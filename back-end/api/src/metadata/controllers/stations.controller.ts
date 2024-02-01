import { Body, Controller, Delete, Get, Param, Post, Query, Session } from '@nestjs/common';
import { StationsService } from '../services/stations.service';
import { CreateStationDto } from '../dtos/create-station.dto';
import { CreateStationElementLimitDto } from '../dtos/create-station-element-limit.dto';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { Admin } from 'src/user/decorators/admin.decorator';

@Controller('stations')
export class StationsController {

  constructor(private readonly stationsService: StationsService) { }

  @Get()
  getStations(@Query('ids', AuthorisedStationsPipe) ids: string[]) {
    return this.stationsService.findStations(ids);
  }

  @Get(':id')
  getCharacteristics(@Param('id') id: string) {
    return this.stationsService.findStation(id);
  }

  @Admin()
  @Post()
  saveCharacteristics(@Body() stationDto: CreateStationDto[]) {
    return this.stationsService.saveStations(stationDto);
  }

  //--------- station elements ----------
  @Get('elements/:id')
  getElements(@Param('id') id: string) {
    return this.stationsService.findElements(id);
  }

  @Admin()
  @Post('elements/:id')
  saveElements(@Param('id') stationId: string, @Body() elementIds: number[]) {
    return this.stationsService.saveElements(stationId, elementIds);
  }

  @Admin()
  @Delete('elements/:stationId/:elementId')
  deleteElement(@Param('stationId') stationId: string, @Param('elementId') elementId: number) {
    return this.stationsService.deleteElement(stationId, elementId);
  }
  //--------------------------

  //--------- station element limits ----------
  @Get('element-limits/:stationId/:elementId/')
  findElementLimits(
    @Param('stationId') stationId: string,
    @Param('elementId') elementId: number) {

    return this.stationsService.findStationElementLimits(stationId, elementId);
  }

  @Admin()
  @Post('element-limits/:stationId/:elementId')
  saveElementLimits(
    @Param('stationId') stationId: string,
    @Param('elementId') elementId: number,
    @Body() elementLimits: CreateStationElementLimitDto[]) {
    return this.stationsService.saveElementLimit(stationId, elementId, elementLimits);
  }

  @Admin()
  @Delete('element-limits/:stationId/:elementId/:monthId')
  deleteElementLimit(
    @Param('stationId') stationId: string,
    @Param('elementId') elementId: number,
    @Param('monthId') monthId: number) {

    return this.stationsService.deleteElementLimit(stationId, elementId, monthId);
  }
  //--------------------------

  //--------- station forms ----------
  @Get('forms/:id')
  findForms(@Param('id') id: string) {
    return this.stationsService.findForms(id);
  }

  @Admin()
  @Post('forms/:id')
  saveForms(@Param('id') stationId: string, @Body() formIds: number[]) {
    return this.stationsService.saveForms(stationId, formIds);
  }

  @Admin()
  @Delete('forms/:stationId/:formId')
  deleteForm(@Param('stationId') stationId: string, @Param('formId') formId: number) {
    return this.stationsService.deleteForm(stationId, formId);
  }
  //--------------------------

}
