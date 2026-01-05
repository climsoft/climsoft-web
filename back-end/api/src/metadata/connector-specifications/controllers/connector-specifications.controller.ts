import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Admin } from 'src/user/decorators/admin.decorator';
import { AuthUtil } from 'src/user/services/auth.util';
import { ConnectorSpecificationsService } from '../services/connector-specifications.service';
import { CreateConnectorSpecificationDto } from '../dtos/create-connector-specification.dto';

@Controller('connector-specifications')
export class ConnectorSpecificationsController {
    constructor(
        private readonly connectorSpecificationsService: ConnectorSpecificationsService,
    ) { }

    @Get()
    public findAll() {
        return this.connectorSpecificationsService.findAll();
    }

    @Get('active')
    public findActive() {
        return this.connectorSpecificationsService.findActiveConnectors();
    }

    @Get(':id')
    public findOne(@Param('id', ParseIntPipe) id: number) {
        return this.connectorSpecificationsService.find(id);
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
    @Delete()
    public deleteAll() {
        return this.connectorSpecificationsService.deleteAll();
    }

    @Admin()
    @Delete(':id')
    public delete(@Param('id', ParseIntPipe) id: number) {
        return this.connectorSpecificationsService.delete(id);
    }
}
