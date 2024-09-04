import { Controller } from '@nestjs/common'; 
import { CreateElementDto } from '../dtos/create-element.dto';
import { BaseNumberController } from 'src/shared/controllers/base-number.controller';
import { ViewElementDto } from 'src/metadata/elements/dtos/view-element.dto';
import { UpdateElementDto } from 'src/metadata/elements/dtos/update-element.dto';
import { ElementsService } from '../services/elements.service';

@Controller("elements")
export class ElementsController extends BaseNumberController<CreateElementDto, UpdateElementDto, ViewElementDto> {

  constructor(private readonly elementsService: ElementsService) {
    super(elementsService);
  }


}


