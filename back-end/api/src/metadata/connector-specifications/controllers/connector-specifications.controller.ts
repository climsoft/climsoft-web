import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Admin } from 'src/user/decorators/admin.decorator';
import { AuthUtil } from 'src/user/services/auth.util';
import { ConnectorSpecificationsService } from '../services/connector-specifications.service';
import { CreateConnectorSpecificationDto, ToggleConnectorDisabledDto } from '../dtos/create-connector-specification.dto';

@Controller('connector-specifications')
export class ConnectorSpecificationsController {
    constructor(
        private readonly connectorSpecificationsService: ConnectorSpecificationsService,
    ) { }

    @Get()
    public findAll() {
        return this.connectorSpecificationsService.findAll(true);
    }

    @Get('active')
    public findActive() {
        return this.connectorSpecificationsService.findActiveConnectors(true);
    }

    @Get(':id')
    public findOne(@Param('id', ParseIntPipe) id: number) {
        return this.connectorSpecificationsService.find(id, true);
    }

    @Admin()
    @Post()
    public create(
        @Req() request: Request,
        @Body() dto: CreateConnectorSpecificationDto
    ) {
        return this.connectorSpecificationsService.create(dto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Patch(':id')
    public update(
        @Req() request: Request,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CreateConnectorSpecificationDto
    ) {
        return this.connectorSpecificationsService.update(id, dto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Patch(':id/disabled')
    public setDisabled(
        @Req() request: Request,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ToggleConnectorDisabledDto,
    ) {
        return this.connectorSpecificationsService.setDisabled(id, dto.disabled, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Delete()
    @HttpCode(204)
    public deleteAll() {
        return this.connectorSpecificationsService.deleteAll();
    }

    @Admin()
    @Delete(':id')
    @HttpCode(204)
    public delete(@Param('id', ParseIntPipe) id: number) {
        return this.connectorSpecificationsService.delete(id);
    }
}
