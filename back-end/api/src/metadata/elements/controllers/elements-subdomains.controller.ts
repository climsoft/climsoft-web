import { Controller, Get } from '@nestjs/common';  
import { ElementSubdomainsService } from '../services/element-subdomains.service';

@Controller("element-subdomains")
export class ElementSubdomainsController {

  constructor(private readonly elementsService: ElementSubdomainsService) { }

  @Get()
  public findElementSubdomains() {
    return this.elementsService.find();
  }


}
