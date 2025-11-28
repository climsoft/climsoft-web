import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator';
import { AuthUtil } from 'src/user/services/auth.util';
import { Request } from 'express';
import { QCTestsService } from '../services/qc-tests.service';
import { FindQCTestQueryDto } from '../dtos/find-qc-test-query.dto';
import { QCTestTypeEnum } from '../entities/qc-test-type.enum';
import { CreateQCTestDto } from '../dtos/create-qc-test.dto';

@Controller('qc-tests')
export class QCTestsController {

    constructor(private qcTestsService: QCTestsService) {
    }

    @Get()
    public find(@Query() findQCQuery: FindQCTestQueryDto) {
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
        @Body() createQcTestDto: CreateQCTestDto) {
        return this.qcTestsService.create(createQcTestDto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Patch(':id')
    public update(
        @Req() request: Request,
        @Param('id', ParseIntPipe) id: number,
        @Body() createQcTestDto: CreateQCTestDto) {
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
