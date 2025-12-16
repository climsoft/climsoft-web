import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator';
import { AuthUtil } from 'src/user/services/auth.util';
import { Request } from 'express';
import { QCSpecificationsService } from '../services/qc-specifications.service';
import { FindQCSpecificationQueryDto } from '../dtos/find-qc-specification-query.dto';
import { QCTestTypeEnum } from '../entities/qc-test-type.enum';
import { CreateQCSpecificationDto } from '../dtos/create-qc-specification.dto';

@Controller('qc-specifications')
export class QCSpecificationsController {

    constructor(private qcTestsService: QCSpecificationsService) {
    }

    @Get()
    public find(@Query() findQCQuery: FindQCSpecificationQueryDto) {
        return this.qcTestsService.find(findQCQuery);
    }

    @Get(':id')
    public findById(@Param('id', ParseIntPipe) id: number) {
        return this.qcTestsService.findById(id);
    }

    @Get('/qc-test-type/:id')
    public findQcTestsByType(@Param('id') id: QCTestTypeEnum) { // TODO validate enum. 
        return this.qcTestsService.findQCTestByType(id);
    }

    @Get('/element/:id')
    public findQcTestsByElement(@Param('id', ParseIntPipe) elementId: number) {
        return this.qcTestsService.findQCTestByElement(elementId);
    }

    @Admin()
    @Post()
    public add(
        @Req() request: Request,
        @Body() createQcTestDto: CreateQCSpecificationDto) {
        return this.qcTestsService.create(createQcTestDto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Patch(':id')
    public update(
        @Req() request: Request,
        @Param('id', ParseIntPipe) id: number,
        @Body() createQcTestDto: CreateQCSpecificationDto) {
        return this.qcTestsService.update(id, createQcTestDto, AuthUtil.getLoggedInUserId(request));
    }

     @Admin()
  @Delete()
  async deleteAll() {
    return this.qcTestsService.deleteAll();
  }

    @Admin()
    @Delete(':id')
    public delete(@Param('id', ParseIntPipe) id: number) {
        return this.qcTestsService.delete(id);
    }


}
