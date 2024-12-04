import { Body, Controller, Delete, FileTypeValidator, Get, Header, MaxFileSizeValidator, Param, ParseFilePipe, ParseIntPipe, Patch, Post, Put, Query, Req, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { UpdateElementDto } from 'src/metadata/elements/dtos/elements/update-element.dto';
import { ElementsService } from '../services/elements.service'; 
import { CreateViewElementDto } from '../dtos/elements/create-view-element.dto';
import { ViewElementQueryDTO } from '../dtos/elements/view-element-query.dto';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { FileInterceptor } from '@nestjs/platform-express';
import { ElementsImportExportService } from '../services/elements-import-export.service';
import { FileIOService } from 'src/shared/services/file-io.service';

@Controller("elements")
export class ElementsController {

  constructor(
    private elementsService: ElementsService,
    private elementsImportExportService: ElementsImportExportService,
    private fileIOService: FileIOService,
  ) { }

  @Get()
  find(
    @Query() viewQueryDto: ViewElementQueryDTO): Promise<CreateViewElementDto[]> {
    return this.elementsService.find(viewQueryDto);
  }

  @Get('id/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number): Promise<CreateViewElementDto> {
    return this.elementsService.findOne(id);
  }

  @Get('count')
  count(@Query() viewQueryDto: ViewElementQueryDTO) {
    return this.elementsService.count(viewQueryDto);
  }

  @Get('download')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="elements.csv"')
  async downloadStationsCsv(
    @Req() request: Request,
  ) {
    // Fetch stations and generate the CSV file
    const csvFilePath = await this.elementsImportExportService.export(AuthUtil.getLoggedInUser(request).id);

    // Stream the file to the response
    return this.fileIOService.createStreamableFile(csvFilePath);
  }

  @Admin()
  @Post()
  async create(
    @Req() request: Request,
    @Body() item: CreateViewElementDto): Promise<CreateViewElementDto> {
    return this.elementsService.add(item, AuthUtil.getLoggedInUserId(request));
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
      await this.elementsImportExportService.import(file, AuthUtil.getLoggedInUserId(request));
      return { message: "success" };
    } catch (error) {
      return { message: `error: ${error}` };
    }
  }

  @Admin()
  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() item: UpdateElementDto): Promise<CreateViewElementDto> {
    return this.elementsService.update(id, item, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete()
  async deleteAll() {
    return this.elementsService.deleteAll();
  }

  @Admin()
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number): Promise<number> {
    return this.elementsService.delete(id);
  }

}


