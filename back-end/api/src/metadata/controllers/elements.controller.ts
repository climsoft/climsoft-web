import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ElementsService } from '../services/elements.service';
import { CreateElementDto } from '../dtos/create-element.dto';
import { Admin } from 'src/shared/decorators/admin.decorator';

@Controller('elements')
export class ElementsController {
  constructor(private readonly elementsService: ElementsService) { }

  @Admin()
  @Get()
  findElements(@Query('ids') ids: number[]) {
    return this.elementsService.findElements(ids);
  }

  @Admin()
  @Get(':id')
  findElement(@Param('id') id: number) {
    return this.elementsService.findElement(id);
  }

  @Admin()
  @Post()
  saveElements(@Body() stationDto: CreateElementDto[]) {
    return this.elementsService.saveElements(stationDto);
  }

}
