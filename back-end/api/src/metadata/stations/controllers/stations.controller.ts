import { Body, Controller, Delete, FileTypeValidator, Get, Header, MaxFileSizeValidator, Param, ParseFilePipe, Patch, Post, Put, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { StationsService } from '../services/stations.service';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { UpdateStationDto } from '../dtos/update-station.dto';
import { CreateStationDto } from '../dtos/create-update-station.dto';
import { ViewStationQueryDTO } from '../dtos/view-station-query.dto';
import { Admin } from 'src/user/decorators/admin.decorator';
import { AuthUtil } from 'src/user/services/auth.util';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { StationsImportExportService } from '../services/stations-import-export.service';
import { FileIOService } from 'src/shared/services/file-io.service';

@Controller('stations')
export class StationsController {
  constructor(
    private stationsService: StationsService,
    private stationImportExportService: StationsImportExportService,
    private fileIOService: FileIOService,
  ) { }

  @Get()
  find(
    @Query() viewQueryDto: ViewStationQueryDTO): CreateStationDto[] {
    return this.stationsService.find(viewQueryDto);
  }

  @Get('id/:id')
  findOne(
    @Param('id') id: string): CreateStationDto {
    return this.stationsService.findOne(id);
  }

  @Get('count')
  count(
    @Query() viewQueryDto: ViewStationQueryDTO) {
    return this.stationsService.count(viewQueryDto);
  }

  @Get('download')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="stations.csv"')
  async downloadStationsCsv(
    @Req() request: Request,
  ) {
    // Fetch stations and generate the CSV file
    const csvFilePath = await this.stationImportExportService.export(AuthUtil.getLoggedInUser(request).id);

    // Stream the file to the response
    return this.fileIOService.createStreamableFile(csvFilePath);
  }

  @Admin()
  @Post()
  async add(
    @Req() request: Request,
    @Body() item: CreateStationDto): Promise<CreateStationDto> {
    return this.stationsService.add(item, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Put('upload')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @Req() request: Request,
    @UploadedFile(new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 1 }), // 1MB. 
        new FileTypeValidator({ fileType: 'text/csv' }),
      ]
    })
    ) file: Express.Multer.File) {
    try {
      await this.stationImportExportService.import(file, AuthUtil.getLoggedInUserId(request));
      return { message: "success" };
    } catch (error) {
      return { message: `error: ${error}` };
    }
  }

  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id', AuthorisedStationsPipe) id: string,
    @Body() item: UpdateStationDto): Promise<CreateStationDto> {
    return this.stationsService.update(id, item, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete()
  async deleteAll() {
    return this.stationsService.deleteAll();
  }

  @Admin()
  @Delete(':id')
  async delete(
    @Param('id') id: string): Promise<string> {
    return this.stationsService.delete(id);
  }

}
