import { Controller } from '@nestjs/common'; 
import { BaseNumberController } from 'src/shared/controllers/base-number.controller';
import { UpdateElementDto } from 'src/metadata/elements/dtos/elements/update-element.dto';
import { ElementsService } from '../services/elements.service';
import { ViewElementDto } from '../dtos/elements/view-element.dto';
import { CreateElementDto } from '../dtos/elements/create-element.dto';

@Controller("elements")
export class ElementsController extends BaseNumberController<CreateElementDto, UpdateElementDto, ViewElementDto> {

  constructor(private readonly elementsService: ElementsService) {
    super(elementsService);
  }


}


