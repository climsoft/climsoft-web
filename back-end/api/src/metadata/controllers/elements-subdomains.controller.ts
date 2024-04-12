import { Controller, Get } from '@nestjs/common';
import { ElementsService } from '../services/elements.service'; 

@Controller("element-subdomains")
export class ElementSubdomainsController {

  constructor(private readonly elementsService: ElementsService) { }

  @Get()
  public findElementSubdomains() {
    return this.elementsService.findElementSubdomains();
  }


}
