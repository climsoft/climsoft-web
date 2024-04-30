import { Controller, Get, Query, ParseArrayPipe, DefaultValuePipe } from '@nestjs/common';
import { ElementsService } from '../../services/elements/elements.service'; 

@Controller("element-types")
export class ElementTypesController {

  constructor(private readonly elementsService: ElementsService) { }

  @Get()
  public findElementTypes(
    @Query('ids',
      new DefaultValuePipe([]),
      new ParseArrayPipe({ items: Number, separator: "," })) ids: number[]) {
    return this.elementsService.findElementTypes(ids);
  }





}
