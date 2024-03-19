import { Controller, Get,  Param, Query, Body, Req, ParseArrayPipe, DefaultValuePipe, ParseIntPipe, Patch } from '@nestjs/common';
import { Request } from 'express';
import { ElementsService } from '../services/elements.service';
import { UpdateElementDto } from '../dtos/update-element.dto';
import { Admin } from 'src/user/decorators/admin.decorator';
import { AuthUtil } from 'src/user/services/auth.util';

@Controller("elements")
export class ElementsController {

  constructor(private readonly elementsService: ElementsService) { }

  @Get()
  public findElements(
    @Query("ids",
      new DefaultValuePipe([]),
      new ParseArrayPipe({ items: Number, separator: "," })) ids: number[]) {
    return this.elementsService.findElements(ids);
  }

  @Get(':id')
  public findElement(@Param("id", ParseIntPipe) id: number) {
    return this.elementsService.findElement(id);
  }

  @Admin()
  @Patch(':id')
  public updateElement(
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() elementDto: UpdateElementDto) {
    return this.elementsService.saveElement(id, elementDto, AuthUtil.getLoggedInUserId(request));
  }

}
