import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { UpdateElementDto } from 'src/metadata/elements/dtos/elements/update-element.dto';
import { ElementsService } from '../services/elements.service';
import { ViewElementDto } from '../dtos/elements/view-element.dto';
import { CreateElementDto } from '../dtos/elements/create-element.dto';
import { ViewElementQueryDTO } from '../dtos/elements/view-element-query.dto';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';

@Controller("elements")
export class ElementsController {

  constructor(private readonly elementsService: ElementsService) { }

  @Get()
  find(
    @Query() viewQueryDto: ViewElementQueryDTO): Promise<ViewElementDto[]> {
    return this.elementsService.find(viewQueryDto);
  }

  @Get('id/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number): Promise<ViewElementDto> {
    return this.elementsService.findOne(id);
  }

  @Get('count')
  count(@Query() viewQueryDto: ViewElementQueryDTO) {
    return this.elementsService.count(viewQueryDto);
  }

  @Admin()
  @Post()
  async create(
    @Req() request: Request,
    @Body() item: CreateElementDto): Promise<ViewElementDto> {
    return this.elementsService.create(item, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() item: UpdateElementDto): Promise<ViewElementDto> {
    return this.elementsService.update(id, item, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number): Promise<number> {
    return this.elementsService.delete(id);
  }

}


