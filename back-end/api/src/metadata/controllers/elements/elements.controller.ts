import { Controller, Get, Param, Query, Body, Req, ParseArrayPipe, DefaultValuePipe, ParseIntPipe, Patch, Post, Delete } from '@nestjs/common';
import { Request } from 'express';
import { ElementsService } from '../../services/elements/elements.service';
import { UpdateElementDto } from '../../dtos/elements/update-element.dto';
import { Admin } from 'src/user/decorators/admin.decorator';
import { AuthUtil } from 'src/user/services/auth.util';
import { CreateElementDto } from '../../dtos/elements/create-element.dto';

@Controller("elements")
export class ElementsController {

  constructor(private readonly elementsService: ElementsService) { }

  @Get()
  public findElements(
    @Query('ids',
      new DefaultValuePipe([]),
      new ParseArrayPipe({ items: Number, separator: "," })) ids: number[]) {
    return this.elementsService.findElements(ids);
  }

  @Get(':id')
  public findElement(@Param('id', ParseIntPipe) id: number) {
    return this.elementsService.findElement(id);
  }

  @Admin()
  @Post()
  saveElements(
    @Req() request: Request,
    @Body() dto: CreateElementDto) {
      // TODO. Validate element id to be > 0
    return this.elementsService.saveElement(dto, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Patch(':id')
  updateElement(
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateElementDto) {
    return this.elementsService.updateElement(id, dto, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete(':id')
  public delete(@Param('id') id: number) {
    return this.elementsService.deleteElement(id);
  }



}
