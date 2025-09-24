import { Body, Controller, Delete, FileTypeValidator, Get, Header, MaxFileSizeValidator, Param, ParseArrayPipe, ParseFilePipe, Patch, Post, Put, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ObservationsService } from '../services/observations.service';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ObservationImportService } from '../services/observation-import.service';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { EntryFormObservationQueryDto } from '../dtos/entry-form-observation-query.dto';
import { DeleteObservationDto } from '../dtos/delete-observation.dto';
import { Admin } from 'src/user/decorators/admin.decorator';
import { ExportObservationsService } from '../services/export-observations.service';
import { AuthorisedExportsPipe } from 'src/user/pipes/authorised-exports.pipe';
import { AuthorisedImportsPipe } from 'src/user/pipes/authorised-imports.pipe';
import { StationStatusQueryDto } from '../dtos/station-status-query.dto';
import { StationStatusDataQueryDto } from '../dtos/station-status-data-query.dto';
import { DataAvailabilityQueryDto } from '../dtos/data-availability-query.dto';
import { DataEntryCheckService } from '../services/data-entry-check.service';
import { DataFlowQueryDto } from '../dtos/data-flow-query.dto';
import { QCStatusEnum } from '../enums/qc-status.enum';

@Controller('observations')
export class ObservationsController {
  constructor(
    private observationsService: ObservationsService,
    private observationUpload: ObservationImportService,
    private exportObservationsService: ExportObservationsService,
    private dataEntryCheckService: DataEntryCheckService,
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

  @Get('form-data')
  getFormData(@Query(AuthorisedStationsPipe) createObsevationQuery: EntryFormObservationQueryDto) {
    return this.observationsService.findFormData(createObsevationQuery);
  }

  @Get('stations-observation-status')
  getStationsObservationStatus(@Query(AuthorisedStationsPipe) stationStatusQuery: StationStatusQueryDto) { // TODO. Create dto query to make the necessary filter
    return this.observationsService.findStationsStatus(stationStatusQuery);
  }

  @Get('stations-observation-status/:stationid')
  getStationObservationsLast24HoursRecords(
    @Param('stationid', AuthorisedStationsPipe) stationId: string,
    @Query() stationStatusQuery: StationStatusDataQueryDto) {
    return this.observationsService.findStationsStatusData(stationId, stationStatusQuery);
  }

  @Get('data-availability-summary')
  getDataAvailabilitySummary(
    @Query(AuthorisedStationsPipe) query: DataAvailabilityQueryDto) {
    return this.observationsService.findDataAvailabilitySummary(query);
  }

  @Get('data-flow')
  getDataFlow(
    @Query(AuthorisedStationsPipe) query: DataFlowQueryDto) {
    return this.observationsService.findDataFlow(query);
  }

  @Get('generate-export/:templateid')
  generateExports(
    @Req() request: Request,
    @Param('templateid', AuthorisedExportsPipe) exportTemplateId: number,
    @Query() viewObsevationQuery: ViewObservationQueryDTO): Promise<number> {
    return this.exportObservationsService.generateExports(exportTemplateId, viewObsevationQuery, AuthUtil.getLoggedInUser(request).id);
  }

  @Get('download-export/:templateid')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="observations.csv"') // TODO. make the name be dynamic
  async download(
    @Req() request: Request,
    @Param('templateid', AuthorisedExportsPipe) exportTemplateId: number
  ) {
    // Stream the exported file to the response
    return await this.exportObservationsService.downloadExport(exportTemplateId, AuthUtil.getLoggedInUser(request).id);
  }

  @Put('data-entry')
  async bulkPut(
    @Req() request: Request,
    @Body(new ParseArrayPipe({ items: CreateObservationDto })) observationDtos: CreateObservationDto[]) {
    // Get logged in user
    const user = AuthUtil.getLoggedInUser(request);

    // Validate form data. If any invalid bad request will be thrown
    await this.dataEntryCheckService.checkData(observationDtos, user);

    // Save the data
    await this.observationsService.bulkPut(observationDtos, user.id);

    // Return success if all operations are successful
    return { message: "success" };
  }

  @Put('data-entry-qc')
  async bulkPutQCData(
    @Req() request: Request,
    @Body(new ParseArrayPipe({ items: CreateObservationDto })) observationDtos: CreateObservationDto[]) {
    // Get logged in user
    const user = AuthUtil.getLoggedInUser(request);

    // Validate form data. If any invalid bad request will be thrown
    await this.dataEntryCheckService.checkData(observationDtos, user);

    // Save the data
    await this.observationsService.bulkPut(observationDtos, user.id, QCStatusEnum.PASSED);

    // Return success if all operations are successful
    return { message: "success" };
  }

  @Post('upload/:sourceid')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() request: Request,
    @Param('sourceid', AuthorisedImportsPipe) sourceId: number,
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
    @Param('sourceid', AuthorisedImportsPipe) sourceId: number,
    @Param('stationid', AuthorisedStationsPipe) stationId: string,
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

  @Admin()
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
