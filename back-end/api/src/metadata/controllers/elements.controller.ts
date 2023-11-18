import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ElementsService } from '../services/elements.service';
import { CreateElementDto } from '../dtos/create-element.dto';

@Controller('elements')
export class ElementsController {
  constructor(private readonly elementsService: ElementsService) { }

  @Get()
  findElements(@Query('ids') ids: number[]) {
    return this.elementsService.findElements(ids);
  }

  @Get(':id')
  findElement(@Param('id') id: number) {
    return this.elementsService.findElement(id);
  }

  @Post()
  saveElements(@Body() stationDto: CreateElementDto[]) {
    return this.elementsService.saveElements(stationDto);
  }

}
