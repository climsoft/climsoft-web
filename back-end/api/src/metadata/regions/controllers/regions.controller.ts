import { Controller, Delete, FileTypeValidator, Get, MaxFileSizeValidator, Param, ParseFilePipe, ParseIntPipe, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { Admin } from 'src/user/decorators/admin.decorator';
import { RegionTypeEnum } from '../enums/region-types.enum';
import { RegionsService } from '../services/regions.service';

@Controller('regions')
export class RegionsController {
  constructor(
    private readonly regionsService: RegionsService) { }

  @Get()
  findAll() {
    return this.regionsService.findAll();
  }

  @Get(':id')
  find(@Param('id', ParseIntPipe) id: number) {
    return this.regionsService.find(id);
  }

  // @Get('/count')
  // count(@Query(AuthorisedStationsPipe) viewObsevationQuery: ViewObservationQueryDTO) {
  //   return this.observationsService.count(viewObsevationQuery,false);
  // }


  @Post('/upload/:regiontype')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() request: Request,
    @Param('regiontype') regionType: RegionTypeEnum,
    @UploadedFile(new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB. 
        new FileTypeValidator({ fileType: 'application/json' }),
      ]
    })
    ) file: Express.Multer.File) {
    try {
      await this.regionsService.extractAndsaveRegions(regionType, file, AuthUtil.getLoggedInUserId(request));
      return { message: "success" };
    } catch (error) {
      return { message: `error: ${error}` };
    }

  }

  @Admin()
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number) {
    return this.regionsService.delete(id);
  }

}
