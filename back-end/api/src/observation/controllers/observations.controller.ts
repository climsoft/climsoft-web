import { Body, Controller, FileTypeValidator, Get, MaxFileSizeValidator, Param, ParseArrayPipe, ParseFilePipe, ParseIntPipe, Post, Query, Req, Session, UploadedFile, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { ObservationsService } from '../services/observations.service';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ObservationUploadService } from '../services/observation-upload.service';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { CreateObservationQueryDto } from '../dtos/create-observation-query.dto';
import { ViewObservationLogQueryDto } from '../dtos/view-observation-log-query.dto';

@Controller('observations')
export class ObservationsController {
  constructor(
    private readonly observationsService: ObservationsService,
    private readonly observationUpload: ObservationUploadService) { }

  @Get()
  getProcessed(@Query(AuthorisedStationsPipe) selectObsevationQuery: ViewObservationQueryDTO) {
    return this.observationsService.findProcessed(selectObsevationQuery);
  }

  @Get('/raw')
  getRaw(@Query(AuthorisedStationsPipe) selectObsevationQuery: CreateObservationQueryDto) {
    return this.observationsService.findRawObs(selectObsevationQuery);
  }

  @Get('/log')
  getObservationLog(@Query(AuthorisedStationsPipe) viewObsevationQuery: ViewObservationLogQueryDto) {
    return this.observationsService.findObsLog(viewObsevationQuery);
  }

  @Post()
  async save(
    @Req() request: Request,
    @Body(AuthorisedStationsPipe, new ParseArrayPipe({ items: CreateObservationDto })) observationDtos: CreateObservationDto[]) {
    await this.observationsService.save(observationDtos, AuthUtil.getLoggedInUserId(request));
    return { message: "success" };
  }

  @Post('/upload/:sourceid')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() request: Request,
    @Param('sourceid', ParseIntPipe) sourceId: number,
    @UploadedFile(new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 100000000 }), //around 1GB
        new FileTypeValidator({ fileType: 'text/csv' }),
      ]
    })
    ) file: Express.Multer.File) {
    try {
      await this.observationUpload.processFile(sourceId, file, AuthUtil.getLoggedInUserId(request));
      return { message: "success" };
    } catch (error) {
      return { message: `error: ${error}` };
    }

  }

  @Post('/upload/:sourceid/:stationid')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFileForStation(
    @Req() request: Request,
    @Param('sourceid', ParseIntPipe) sourceId: number,
    @Param('stationid') stationId: string,
    @UploadedFile(new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 100000000 }), //around 1GB
        new FileTypeValidator({ fileType: 'text/csv' }),
      ]
    })
    ) file: Express.Multer.File) {

    try {
      await this.observationUpload.processFile(sourceId, file, AuthUtil.getLoggedInUserId(request), stationId);
      return { message: "success" };
    } catch (error) {
      return { message: `error: ${error}` };
    }

  }



}
