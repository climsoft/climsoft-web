import { Controller } from '@nestjs/common';
import { ElementsService } from '../../services/elements/elements.service';
import { CreateElementDto } from '../../dtos/elements/create-element.dto';
import { BaseNumberController } from 'src/shared/controllers/base-number.controller';
import { ViewElementDto } from 'src/metadata/dtos/elements/view-element.dto';
import { UpdateElementDto } from 'src/metadata/dtos/elements/update-element.dto';

@Controller("elements")
export class ElementsController extends BaseNumberController<CreateElementDto, UpdateElementDto, ViewElementDto> {

  constructor(private readonly elementsService: ElementsService) {
    super(elementsService);
  }

  // @Get()
  // public findAll(
  //   @Query('ids',
  //     new DefaultValuePipe([]),
  //     new ParseArrayPipe({ items: Number, separator: "," })) ids: number[]) {
  //   return this.elementsService.findAll(ids);
  // }

  // @Get(':id')
  // public find(@Param('id', ParseIntPipe) id: number) {
  //   return this.elementsService.findOne(id);
  // }

  // @Admin()
  // @Post()
  // public create(
  //   @Req() request: Request,
  //   @Body() dto: CreateElementDto) {
  //   return this.elementsService.create(dto, AuthUtil.getLoggedInUserId(request));
  // }

  // @Admin()
  // @Patch(':id')
  // public update(
  //   @Req() request: Request,
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() dto: UpdateElementDto) {
  //   return this.elementsService.update(id, dto, AuthUtil.getLoggedInUserId(request));
  // }

  // @Admin()
  // @Delete(':id')
  // public delete(@Param('id', ParseIntPipe) id: number) {
  //   return this.elementsService.delete(id);
  // }



}


