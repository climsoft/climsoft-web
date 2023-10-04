import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { StationsService } from '../services/stations.service';
import { CreateStationDto } from '../dtos/station.dto';
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
    console.log('chracteristics', id)
    return this.stationsService.findOne(id);
  }

  @Get('forms/:id')
  findForms(@Param('id') id: string) {
    console.log('forms', id)
    return this.stationsService.findForms(id);
  }

  @Post()
  saveCharacteristics(@Body() stationDto: CreateStationDto) {
    return this.stationsService.saveCharacteristics(stationDto);
  }

  @Post('forms')
  saveForms(@Body() stationFormDtos: CreateStationFormDto[]) {
    return this.stationsService.saveForms(stationFormDtos);
  }


  // @Delete(':id')
  // removeStation(@Param('id') id: string) {
  //   return this.stationsService.remove(id);
  // }

}
