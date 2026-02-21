import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator'; 
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util'; 
import { NetworkAffiliationsService } from '../services/network-affiliations.service';
import { ViewNetworkAffiliationQueryDTO } from '../dtos/view-network-affiliation-query.dto';
import { CreateUpdateNetworkAffiliationDto } from '../dtos/create-update-network-affiliation.dto';
import { ViewNetworkAffiliationDto } from '../dtos/view-network-affiliation.dto';

@Controller('network-affiliations')
export class NetworkAffiliationsController {
  constructor(
    private readonly networkAffiliationsService: NetworkAffiliationsService) {
  }

  @Get()
  find(@Query() viewRegionQueryDto: ViewNetworkAffiliationQueryDTO) {
    return this.networkAffiliationsService.find(viewRegionQueryDto);
  }

  @Get('id/:id')
  findOne(@Param('id', ParseIntPipe) id: number) : ViewNetworkAffiliationDto {
    return this.networkAffiliationsService.findOne(id);
  }

  @Get('count')
  count(@Query() viewRegionQueryDto: ViewNetworkAffiliationQueryDTO) : number {
    return this.networkAffiliationsService.count(viewRegionQueryDto);
  }

  @Admin()
  @Post()
  async create(
    @Req() request: Request,
    @Body() item: CreateUpdateNetworkAffiliationDto): Promise<ViewNetworkAffiliationDto> {
    return this.networkAffiliationsService.add(item, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() item: CreateUpdateNetworkAffiliationDto): Promise<ViewNetworkAffiliationDto> {
    return this.networkAffiliationsService.update(id, item, AuthUtil.getLoggedInUserId(request));
  }

  @Admin()
  @Delete()
  async deleteAll() {
    return this.networkAffiliationsService.deleteAll();
  }

}
