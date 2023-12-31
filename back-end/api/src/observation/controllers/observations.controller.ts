import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ObservationsService } from '../services/observations.service';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { SelectObservationDTO } from '../dtos/select-observation.dto';

@Controller('observations')
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService) { }

  @Get()
  find(@Query() selectObsevationQuery: SelectObservationDTO) {
    return this.observationsService.find(selectObsevationQuery);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   //return this.observationsService.findOne(id);
  // }

  @Post()
  create(@Body() observationDtos: CreateObservationDto[]) {
    //console.log('dtos', observationDtos);
    return this.observationsService.save(observationDtos);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() observationDto: CreateObservationDto) {
  //   return this.observationsService.update(id, observationDto);
  // }

  //todo. these delte has been left here for reference purposes.
  //a delete command can have a body
  // @Delete(':id')
  // delete(@Param('id') id: string,@Body() observations: CreateObservationDto[]) {
  //   return this.observationsService.remove(id);
  // }

}
