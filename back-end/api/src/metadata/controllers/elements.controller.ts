import { Controller, Get, Post, Param, Query, Body, Req, ParseArrayPipe, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { Request } from 'express';
import { ElementsService } from '../services/elements.service';
import { CreateElementDto } from '../dtos/create-element.dto';
import { Admin } from 'src/user/decorators/admin.decorator';
import { AuthUtil } from 'src/user/services/auth.util';

@Controller("elements")
export class ElementsController {
  constructor(private readonly elementsService: ElementsService) { }

  @Get()
  findElements(
    @Query("ids",
      new DefaultValuePipe([]),
      new ParseArrayPipe({ items: Number, separator: "," })) ids: number[]) {
    return this.elementsService.findElements(ids);
  }

  @Get(':id')
  findElement(@Param("id", ParseIntPipe) id: number) {
    return this.elementsService.findElement(id);
  }

  @Admin()
  @Post()
  saveElements(
    @Req() request: Request,
    @Body(new ParseArrayPipe({ items: CreateElementDto })) elementDtos: CreateElementDto[]) {
    console.log("element saved", elementDtos);

    return this.elementsService.saveElements(elementDtos, AuthUtil.getLoggedInUserId(request));
  }

}
