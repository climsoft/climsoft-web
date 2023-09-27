import { Controller, Get, Param, Query } from '@nestjs/common';
import { ElementsService } from '../services/elements.service';

@Controller('elements')
export class ElementsController {
    constructor(private readonly elementsService: ElementsService) { }

    @Get()
    find(@Query('ids') ids: number[]) {
      return this.elementsService.find(ids);
    }

   

}
