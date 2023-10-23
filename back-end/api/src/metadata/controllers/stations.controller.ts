import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { StationsService } from '../services/stations.service';
import { CreateStationDto } from '../dtos/create-station.dto';
import { CreateStationFormDto } from '../dtos/create-station-form.dto';

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
    return this.stationsService.findOne(id);
  }

  @Post()
  saveCharacteristics(@Body() stationDto: CreateStationDto[]) {
    return this.stationsService.save(stationDto);
  }

  @Get('elements/:id')
  findElements(@Param('id') id: string) {
    return this.stationsService.findElements(id);
  }

  @Post('elements/:id')
  saveElements(@Param('id') stationId: string, @Body() elementIds: number[]) {
    return this.stationsService.saveElements(stationId, elementIds);
  }

  @Delete('elements/:id')
  deleteElements(@Param('id') stationId: string, @Body() elementIds: number[]) {
    return this.stationsService.deleteElements(stationId, elementIds);
  }

  @Get('element-limits/:id')
  findElementLimits(@Param('id') id: string) {
    //todo. left here
    return this.stationsService.findElements(id);
  }

  @Post('element-limits/:id')
  saveElementLimits(@Param('id') stationId: string, @Body() elementIds: number[]) {
    //todo
    return this.stationsService.saveElements(stationId, elementIds);
  }

  @Delete('element-limits/:id')
  deleteElementLimits(@Param('id') stationId: string, @Body() elementIds: number[]) {
    //todo
    return this.stationsService.deleteElements(stationId, elementIds);
  }


  @Get('forms/:id')
  findForms(@Param('id') id: string) {
    return this.stationsService.findForms(id);
  }

  @Post('forms/:id')
  saveForms(@Param('id') stationId: string, @Body() formIds: number[]) {
    return this.stationsService.saveForms(stationId, formIds);
  }

  
  @Delete('forms/:id')
  deleteForms(@Param('id') stationId: string, @Body() formIds: number[]) {
    return this.stationsService.deleteForms(stationId, formIds);
  }




}
