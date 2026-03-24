import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { CreateUpdateFlagDto } from '../dtos/create-update-flag.dto';
import { ViewFlagDto } from '../dtos/view-flag.dto';
import { AuthUtil } from 'src/user/services/auth.util';
import { FlagsService } from '../services/flags.service';

@Controller('flags')
export class FlagsController {
  constructor(
    private readonly flagsService: FlagsService) {
  }

  @Get()
  find() {
    return this.flagsService.find();
  }

  @Get('id/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.flagsService.findOne(id);
  }

  @Get('count')
  count() {
    return this.flagsService.count();
  }

  @Admin()
  @Post()
  async create(
    @Req() request: Request,
    @Body() item: CreateUpdateFlagDto): Promise<ViewFlagDto> {
    return this.flagsService.add(item, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() item: CreateUpdateFlagDto): Promise<ViewFlagDto> {
    return this.flagsService.update(id, item, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete()
  async deleteAll() {
    return this.flagsService.deleteAll();
  }
}
