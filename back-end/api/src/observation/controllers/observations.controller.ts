import { Body, Controller, Delete, FileTypeValidator, Get, MaxFileSizeValidator, Param, ParseArrayPipe, ParseFilePipe, Patch, Post, Put, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ObservationsService } from '../services/observations.service';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ObservationImportService } from '../services/observations-import.service';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { EntryFormObservationQueryDto } from '../dtos/entry-form-observation-query.dto';
import { DeleteObservationDto } from '../dtos/delete-observation.dto';
import { Admin } from 'src/user/decorators/admin.decorator';
import { ObservationsExportService } from '../services/export/observations-export.service';
import { AuthorisedExportsPipe } from 'src/user/pipes/authorised-exports.pipe';
import { AuthorisedImportsPipe } from 'src/user/pipes/authorised-imports.pipe';
import { StationStatusQueryDto } from '../dtos/station-status-query.dto';
import { StationStatusDataQueryDto } from '../dtos/station-status-data-query.dto';
import { DataAvailabilitySummaryQueryDto } from '../dtos/data-availability-summary-query.dto';
import { DataEntryAndCorrectionCheckService } from '../services/data-entry-check.service';
import { DataFlowQueryDto } from '../dtos/data-flow-query.dto';
import { QCStatusEnum } from '../enums/qc-status.enum';
import { DataAvailabilityDetailsQueryDto } from '../dtos/data-availability-details-query.dto';

@Controller('observations')
export class ObservationsController {
  constructor(
    private observationsService: ObservationsService,
    private observationImportService: ObservationImportService,
    private observationExportsService: ObservationsExportService,
    private dataEntryCheckService: DataEntryAndCorrectionCheckService,
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
    @Query(AuthorisedStationsPipe) query: DataAvailabilitySummaryQueryDto) {
    return this.observationsService.findDataAvailabilitySummary(query);
  }

  @Get('data-availability-details')
  getDataAvailabilitydetails(
    @Query(AuthorisedStationsPipe) query: DataAvailabilityDetailsQueryDto) {
    return this.observationsService.findDataAvailabilityDetails(query);
  }

  @Get('data-flow')
  getDataFlow(
    @Query(AuthorisedStationsPipe) query: DataFlowQueryDto) {
    return this.observationsService.findDataFlow(query);
  }

  @Get('generate-export/:specificationid')
  generateExports(
    @Req() request: Request,
    @Param('specificationid', AuthorisedExportsPipe) exportSpecificationId: number,
    @Query() viewObsevationQuery: ViewObservationQueryDTO) {
    return this.observationExportsService.generateManualExport(exportSpecificationId, viewObsevationQuery, AuthUtil.getLoggedInUser(request));
  }

  @Get('download-export/:uniquedownloadid')
  async download(
    @Param('uniquedownloadid') uniqueDownloadId: string
  ) {
    // Stream the exported file to the response
    return this.observationExportsService.manualDownloadExport(uniqueDownloadId);
  }

  @Put('data-entry')
  async bulkPut(
    @Req() request: Request,
    @Body(new ParseArrayPipe({ items: CreateObservationDto })) observationDtos: CreateObservationDto[]) {
    // Get logged in user
    const user = AuthUtil.getLoggedInUser(request);

    // Validate form data. If any invalid bad request will be thrown
    await this.dataEntryCheckService.checkData(observationDtos, user, 'data-entry');

    // Save the data
    await this.observationsService.bulkPut(observationDtos, user.id);

    // // TODO. deprecate the JSON below and just return http success - http 200
    return { message: "success" };
  }

  @Put('data-entry-qc')
  async bulkPutQCData(
    @Req() request: Request,
    @Body(new ParseArrayPipe({ items: CreateObservationDto })) observationDtos: CreateObservationDto[]) {
    // Get logged in user
    const user = AuthUtil.getLoggedInUser(request);

    // Validate form data. If any invalid bad request will be thrown
    await this.dataEntryCheckService.checkData(observationDtos, user, 'data-entry');

    // Save the data
    await this.observationsService.bulkPut(observationDtos, user.id, QCStatusEnum.PASSED);

    // TODO. Just return success - http 200
    return { message: "success" };
  }

  //-------------------------------------------------------------------------------
  // TODO. Consider merging the below upload handlers or deprecating them.
  // Once import preview is considered as first enough even for large imports, it may not be necessary to have this handler for by front end.
  // For external systems. Consider using source names instead of source id.
  //-------------------------------------------------------------------------------
  // TODO. Merge this with route `'upload/:sourceid/:stationid'`. This can be done by using a dto that has both source id and station id, with station id being optional.
  // Note, the front end manual import uses `ImportPreviewController` controller. So this should be deprecated or modified for external systems only.
  @Post('upload/:sourceid')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() request: Request,
    @Param('sourceid', AuthorisedImportsPipe) sourceId: number,
    @UploadedFile(new ParseFilePipe({
      validators: [
        // 1GB to accomodate preview of large files. Note, should always be same us that used in `ImportPreviewController` for upload endpoint to ensure smooth preview of files uploaded for import.
        new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 1024 }),
        new FileTypeValidator({ fileType: /(text\/csv|text\/plain|application\/octet-stream)/, fallbackToMimetype: true }),
      ]
    })
    ) file: Express.Multer.File) {
    return this.observationImportService.processManualImport(sourceId, file, AuthUtil.getLoggedInUser(request).id);
  }

  // TODO. Merge this with route `'upload/:sourceid'`. This can be done by using a dto that has both source id and station id, with station id being optional.
  // Note, front end manual import uses `ImportPreviewController` controller. So this should be deprecated or modified for external systems only.
  @Post('upload/:sourceid/:stationid')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFileForStation(
    @Req() request: Request,
    @Param('sourceid', AuthorisedImportsPipe) sourceId: number,
    @Param('stationid', AuthorisedStationsPipe) stationId: string,
    @UploadedFile(new ParseFilePipe({
      validators: [
        // 1GB to accomodate preview of large files. Note, should always be same us that used in `ImportPreviewController` for upload endpoint to ensure smooth preview of files uploaded for import.
        new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 1024 }),
        new FileTypeValidator({ fileType: /(text\/csv|text\/plain|application\/octet-stream)/, fallbackToMimetype: true }),
      ]
    })
    ) file: Express.Multer.File) {

    return this.observationImportService.processManualImport(sourceId, file, AuthUtil.getLoggedInUser(request).id, stationId);
  }
  //-------------------------------------------------------------------------------

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
    const user = AuthUtil.getLoggedInUser(request);
    // Validate form data. If any invalid bad request will be thrown
    await this.dataEntryCheckService.checkData(observationDtos, user, 'data-entry');

    return this.observationsService.softDelete(observationDtos, user.id);
  }

  @Admin()
  @Delete('hard')
  async hardDelete(
    @Body(AuthorisedStationsPipe, new ParseArrayPipe({ items: DeleteObservationDto })) observationDtos: DeleteObservationDto[]) {
    return this.observationsService.hardDelete(observationDtos);
  }

}
