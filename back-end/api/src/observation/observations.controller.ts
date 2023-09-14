import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ObservationsService } from './observations.service';
import { CreateObservationDto } from './dto/create-observation.dto';
import { SelectObservationDTO } from './dto/select-observation.dto';

@Controller('observations')
export class ObservationsController {
    constructor(private readonly observationsService: ObservationsService) { }

  @Get()
  find(@Query() selectObsevationQuery: SelectObservationDTO) {
    return this.observationsService.findAll(selectObsevationQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    //return this.observationsService.findOne(id);
  }

  @Post()
  create(@Body() observationDto: CreateObservationDto[]) {
    return this.observationsService.save(observationDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() observationDto: CreateObservationDto) {
    return this.observationsService.update(id, observationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.observationsService.remove(id);
  }

}
