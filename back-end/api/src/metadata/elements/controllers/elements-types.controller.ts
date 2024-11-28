import { Controller, Get } from '@nestjs/common'; 
import { ElementTypesService } from '../services/element-types.service';

@Controller("element-types")
export class ElementTypesController {

  constructor(private readonly elementTypesService: ElementTypesService) { }

  @Get()
  public findElementTypes() {
    return this.elementTypesService.find();
  }





}
