import { Controller, Get } from '@nestjs/common';
import { ElementsService } from './elements.service';

@Controller('elements')
export class ElementsController {
    constructor(private readonly elementsService: ElementsService) { }

    @Get()
    findAll() {
      // const { limit, offset } = paginationQuery;
      return this.elementsService.findAll();
    }

}
