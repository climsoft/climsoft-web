import { Controller, Get, Post, Param, Query, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { ElementsService } from '../services/elements.service';
import { CreateElementDto } from '../dtos/create-element.dto';
import { Admin } from 'src/user/decorators/admin.decorator';
import { LoggedInUserDto } from 'src/user/dtos/logged-in-user.dto';

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
  saveElements(@Req() request: Request, @Body() elementDto: CreateElementDto[]) {
    return this.elementsService.saveElements(elementDto, ((request.session as any).user as LoggedInUserDto).id);
  }

}
