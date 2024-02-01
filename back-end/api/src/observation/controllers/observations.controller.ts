import { Body, Controller, FileTypeValidator, Get, MaxFileSizeValidator, ParseFilePipe, Post, Query, Session, UploadedFile, UseInterceptors, UsePipes } from '@nestjs/common';
import { ObservationsService } from '../services/observations.service';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { SelectObservationDTO } from '../dtos/select-observation.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ObservationUploadService } from '../services/observation-upload.service'; 
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';

@Controller('observations')
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService,
    private readonly observationUpload: ObservationUploadService,) { }

 
  @Get()
  getProcessed(@Query(AuthorisedStationsPipe) selectObsevationQuery: SelectObservationDTO) {
    return this.observationsService.findProcessed(selectObsevationQuery);
  }


  @Get('/raw')
  getRaw(@Query(AuthorisedStationsPipe) selectObsevationQuery: SelectObservationDTO) {
    return this.observationsService.findRaw(selectObsevationQuery);
  }

  @Post()
  save(@Body(AuthorisedStationsPipe) observationDtos: CreateObservationDto[]) {
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

    //session.userId = session.userId ? session.userId : 1;
    return this.observationUpload.processFile(session, file);
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
