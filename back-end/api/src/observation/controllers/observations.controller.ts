import { Body, Controller, Delete, FileTypeValidator, Get, MaxFileSizeValidator, Param, ParseArrayPipe, ParseFilePipe, ParseIntPipe, Patch, Post, Put, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ObservationsService } from '../services/observations.service';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ObservationImportService } from '../services/observation-import.service';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { EntryFormObservationQueryDto } from '../dtos/entry-form-observation-query.dto';
import { ViewObservationLogQueryDto } from '../dtos/view-observation-log-query.dto';
import { DeleteObservationDto } from '../dtos/delete-observation.dto';
import { Admin } from 'src/user/decorators/admin.decorator';

@Controller('observations')
export class ObservationsController {
  constructor(
    private readonly observationsService: ObservationsService,
    private readonly observationUpload: ObservationImportService) { }

  @Get()
  getProcessed(@Query(AuthorisedStationsPipe) viewObsevationQuery: ViewObservationQueryDTO) {
    return this.observationsService.findProcessed(viewObsevationQuery);
  }

  @Get('count')
  count(@Query(AuthorisedStationsPipe) viewObsevationQuery: ViewObservationQueryDTO) {
    return this.observationsService.count(viewObsevationQuery);
  }

  @Get('raw')
  getRaw(@Query(AuthorisedStationsPipe) createObsevationQuery: EntryFormObservationQueryDto) {
    return this.observationsService.findRawObs(createObsevationQuery);
  }

  @Get('log')
  getObservationLog(@Query(AuthorisedStationsPipe) viewObsevationQuery: ViewObservationLogQueryDto) {
    return this.observationsService.findObsLog(viewObsevationQuery);
  }

  @Put()
  async bulkPut(
    @Req() request: Request,
    @Body(AuthorisedStationsPipe, new ParseArrayPipe({ items: CreateObservationDto })) observationDtos: CreateObservationDto[]) {
    const user = AuthUtil.getLoggedInUser(request);
    await this.observationsService.bulkPut(observationDtos, user.id, user.username);
    return { message: "success" };
  }


  @Post('upload/:sourceid')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() request: Request,
    @Param('sourceid', ParseIntPipe) sourceId: number,
    @UploadedFile(new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 1024 * 1 }), // 1GB
        new FileTypeValidator({ fileType: 'text/csv' }),
      ]
    })
    ) file: Express.Multer.File) {
    try {
      const user = AuthUtil.getLoggedInUser(request);
      await this.observationUpload.processFile(sourceId, file, user.id, user.username);
      return { message: "success" };
    } catch (error) {
      return { message: `error: ${error}` };
    }

  }

  @Post('upload/:sourceid/:stationid')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFileForStation(
    @Req() request: Request,
    @Param('sourceid', ParseIntPipe) sourceId: number,
    @Param('stationid') stationId: string,
    @UploadedFile(new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 1024 }), // 1GB
        new FileTypeValidator({ fileType: 'text/csv' }),
      ]
    })
    ) file: Express.Multer.File) {

    try {
      const user = AuthUtil.getLoggedInUser(request);
      await this.observationUpload.processFile(sourceId, file, user.id, user.username, stationId);
      return { message: "success" };
    } catch (error) {
      return { message: `error: ${error}` };
    }

  }


  @Patch('restore')
  async restore(
    @Req() request: Request,
    @Body(AuthorisedStationsPipe, new ParseArrayPipe({ items: DeleteObservationDto })) observationDtos: DeleteObservationDto[]) {
    return this.observationsService.restore(observationDtos, AuthUtil.getLoggedInUserId(request));
  }

  @Delete('soft')
  async softDelete(
    @Req() request: Request,
    @Body(AuthorisedStationsPipe, new ParseArrayPipe({ items: DeleteObservationDto })) observationDtos: DeleteObservationDto[]) {
    return this.observationsService.softDelete(observationDtos, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete('hard')
  async hardDelete(
    @Body(AuthorisedStationsPipe, new ParseArrayPipe({ items: DeleteObservationDto })) observationDtos: DeleteObservationDto[]) {
    return this.observationsService.hardDelete(observationDtos);
  }

}
