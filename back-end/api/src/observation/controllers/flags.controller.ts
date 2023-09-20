import { Controller,Get } from '@nestjs/common';
import { FlagsService } from '../services/flags.service';

@Controller('flags')
export class FlagsController {

    constructor(private readonly flagsService: FlagsService) { }

    @Get()
    find() {
        return this.flagsService.find();   
    }

}
