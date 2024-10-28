import { Controller, Delete, FileTypeValidator, Get, MaxFileSizeValidator, Param, ParseFilePipe, ParseIntPipe, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { Admin } from 'src/user/decorators/admin.decorator';
import { RegionTypeEnum } from '../enums/region-types.enum';
import { RegionsService } from '../services/regions.service';
import { ViewRegionQueryDTO } from '../dtos/view-region-query.dto';

@Controller('regions')
export class RegionsController {
  constructor(
    private readonly regionsService: RegionsService) {
  }

  @Get()
  find(@Query() viewRegionQueryDto: ViewRegionQueryDTO) {
    return  this.regionsService.find(viewRegionQueryDto);
  }

  @Get('id:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.regionsService.findOne(id);
  }

  @Get('count')
  count(@Query() viewRegionQueryDto: ViewRegionQueryDTO) {
    return this.regionsService.count(viewRegionQueryDto);
  }

  @Admin()
  @Post('upload/:regiontype')
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
  @Delete('delete-all')
  async delete() {
    return this.regionsService.deleteAll();
  }

}
