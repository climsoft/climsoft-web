import { Body, Controller, Get, Param, ParseIntPipe, Patch, Req } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { GeneralSettingsService } from '../services/general-settings.service';
import { UpdateGeneralSettingDto } from '../dtos/update-general-setting.dto';  

@Controller('general-settings')
export class GeneralSettingController {

    constructor(
        private  generalSettingsService: GeneralSettingsService, 
    ) { }

    @Get()
    public findAll() {
        return this.generalSettingsService.findAll();
    }

    @Get(':id')
    public find(@Param('id', ParseIntPipe) id: number) { 
        return this.generalSettingsService.find(id);
    }

    @Admin()
    @Patch(':id')
    public async update(
        @Req() request: Request,
        @Param('id', ParseIntPipe) id: number,
        @Body() createSourceDto: UpdateGeneralSettingDto) { // TODO. Validate the dto
        return this.generalSettingsService.update(id, createSourceDto, AuthUtil.getLoggedInUserId(request));
    }

}
