import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { StationsService } from '../services/stations.service';
import { CreateStationDto } from '../dtos/create-station.dto';
import { CreateStationElementLimitDto } from '../dtos/create-station-element-limit.dto';

@Controller('stations')
export class StationsController {

  constructor(private readonly stationsService: StationsService) { }

  @Get()
  findAll() {
    // const { limit, offset } = paginationQuery;
    return this.stationsService.findAll();
  }

  @Get(':id')
  findCharacteristics(@Param('id') id: string) {
    return this.stationsService.findStation(id);
  }

  @Post()
  saveCharacteristics(@Body() stationDto: CreateStationDto[]) {
    return this.stationsService.saveStations(stationDto);
  }

  //--------- station elements ----------
  @Get('elements/:id')
  findElements(@Param('id') id: string) {
    return this.stationsService.findElements(id);
  }

  @Post('elements/:id')
  saveElements(@Param('id') stationId: string, @Body() elementIds: number[]) {
    return this.stationsService.saveElements(stationId, elementIds);
  }

  @Delete('elements/:stationId/:elementId')
  deleteElement(@Param('stationId') stationId: string, @Param('elementId') elementId: number) {
    return this.stationsService.deleteElement(stationId, elementId);
  }
  //--------------------------

  //--------- station element limits ----------
  @Get('element-limits/:id')
  findElementLimits(@Param('id') id: string) {
    //todo. left here
    return this.stationsService.findElements(id);
  }

  @Post('element-limits/:stationId/:elementId/:monthId')
  saveElementLimits(
    @Param('stationId') stationId: string,
    @Param('elementId') elementId: number,
    @Param('monthId') monthId: number,
    @Body() elementLimits: CreateStationElementLimitDto) {
    return this.stationsService.saveElementLimit(stationId, elementId, monthId, elementLimits);
  }

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

  @Post('forms/:id')
  saveForms(@Param('id') stationId: string, @Body() formIds: number[]) {
    return this.stationsService.saveForms(stationId, formIds);
  }

  @Delete('forms/:stationId/:formId')
  deleteForm(@Param('stationId') stationId: string, @Param('formId') formId: number) {
    return this.stationsService.deleteForm(stationId, formId);
  }
  //--------------------------

}
