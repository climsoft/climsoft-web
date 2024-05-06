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


}


