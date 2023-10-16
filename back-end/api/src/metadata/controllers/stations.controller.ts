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

  @Get('forms/:id')
  findForms(@Param('id') id: string) {
    return this.stationsService.findForms(id);
  }


  @Post('forms/:id')
  saveForms(@Param('id') stationId: string, @Body() formIds: number[]) {
    return this.stationsService.saveForms(stationId, formIds);
  }


  // @Delete(':id')
  // removeStation(@Param('id') id: string) {
  //   return this.stationsService.remove(id);
  // }

}
