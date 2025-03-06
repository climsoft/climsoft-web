import { Body, Controller, Delete, FileTypeValidator, Get, Header, MaxFileSizeValidator, Param, ParseArrayPipe, ParseFilePipe, ParseIntPipe, Patch, Post, Put, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
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
import { ExportObservationsService } from '../services/export-observations.service';

@Controller('observations')
export class ObservationsController {
  constructor(
    private observationsService: ObservationsService,
    private observationUpload: ObservationImportService,
    private exportObservationsService: ExportObservationsService,
  ) { }

  @Get()
  getProcessed(@Query(AuthorisedStationsPipe) viewObsevationQuery: ViewObservationQueryDTO) {
    return this.observationsService.findProcessed(viewObsevationQuery);
  }

  @Get('count')
  count(@Query(AuthorisedStationsPipe) viewObsevationQuery: ViewObservationQueryDTO) {
    return this.observationsService.count(viewObsevationQuery);
  }

  @Get('count-v4-unsaved-observations')
  countObservationsNotSavedToV4() {
    return this.observationsService.countObservationsNotSavedToV4();
  }

  @Get('raw')
  getRaw(@Query(AuthorisedStationsPipe) createObsevationQuery: EntryFormObservationQueryDto) {
    return this.observationsService.findRawObs(createObsevationQuery);
  }

  @Get('log')
  getObservationLog(@Query(AuthorisedStationsPipe) viewObsevationQuery: ViewObservationLogQueryDto) {
    return this.observationsService.findObservationLog(viewObsevationQuery);
  }

  @Get('generate-export/:templateid')
  generateExports(@Param('templateid', ParseIntPipe) exportTemplateId: number): Promise<number> {
    return this.exportObservationsService.generateExports(exportTemplateId);
  }

  @Get('download-export/:templateid')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="observations.csv"') // TODO. make the name be dynamic
  async download(
    @Req() request: Request,
    @Param('templateid', ParseIntPipe) exportTemplateId: number// TODO. check on authorisation
  ) {
    // Stream the exported file to the response
    return await this.exportObservationsService.downloadExport(exportTemplateId, AuthUtil.getLoggedInUser(request).id);
  }

  @Put()
  async bulkPut(
    @Req() request: Request,
    @Body(AuthorisedStationsPipe, new ParseArrayPipe({ items: CreateObservationDto })) observationDtos: CreateObservationDto[]) {
    const user = AuthUtil.getLoggedInUser(request);
    await this.observationsService.bulkPut(observationDtos, user.id);
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
