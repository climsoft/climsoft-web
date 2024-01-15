import { Body, Controller, FileTypeValidator, Get, MaxFileSizeValidator, ParseFilePipe, Post, Query, Session, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ObservationsService } from '../services/observations.service';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { SelectObservationDTO } from '../dtos/select-observation.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ObservationUploadService } from '../services/observation-upload.service';

@Controller('observations')
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService,
    private readonly  observationUpload: ObservationUploadService,) { }

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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 10000000 }), //around 10mb
        new FileTypeValidator({ fileType: 'text/csv' }),
      ],
    }),
  ) file: Express.Multer.File, @Session() session: Record<string, any>) {

    session.userId = session.userId ? session.userId : 1;
    return this.observationUpload.processFile( session.userId, file);
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
