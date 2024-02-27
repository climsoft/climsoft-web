import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ElementsService } from '../services/elements.service';
import { CreateElementDto } from '../dtos/create-element.dto'; 
import { Admin } from 'src/user/decorators/admin.decorator';

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

  @Admin()
  @Post()
  saveElements(@Body() elementDto: CreateElementDto[]) {
    return this.elementsService.saveElements(elementDto);
  }

}
