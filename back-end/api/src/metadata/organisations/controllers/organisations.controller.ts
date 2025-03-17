import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator'; 
import { ViewOrganisationQueryDTO } from '../dtos/view-organisation-query.dto';
import { Request } from 'express';
import { CreateUpdateOrganisationDto } from '../dtos/create-update-organisation.dto';
import { ViewOrganisationDto } from '../dtos/view-organisation.dto';
import { AuthUtil } from 'src/user/services/auth.util';
import { OrganisationsService } from '../services/organisations.service';

@Controller('organisations')
export class OrganisationsController {
  constructor(
    private readonly organisationsService: OrganisationsService) {
  }

  @Get()
  find(@Query() viewRegionQueryDto: ViewOrganisationQueryDTO) {
    return this.organisationsService.find(viewRegionQueryDto);
  }

  @Get('id/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.organisationsService.findOne(id);
  }

  @Get('count')
  count(@Query() viewRegionQueryDto: ViewOrganisationQueryDTO) {
    return this.organisationsService.count(viewRegionQueryDto);
  }

  @Admin()
  @Post()
  async create(
    @Req() request: Request,
    @Body() item: CreateUpdateOrganisationDto): Promise<ViewOrganisationDto> {
    return this.organisationsService.add(item, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() item: CreateUpdateOrganisationDto): Promise<ViewOrganisationDto> {
    return this.organisationsService.update(id, item, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete()
  async deleteAll() {
    return this.organisationsService.deleteAll();
  }

}
