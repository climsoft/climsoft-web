import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator';
import { QCTestsService } from './services/qc-tests.service';
import { CreateQCTestDto } from './dtos/create-qc-test.dto';
import { QCTestTypeEnum } from './entities/qc-test-type.enum';
import { AuthUtil } from 'src/user/services/auth.util';
import { Request } from 'express';
import { FindQCTestQueryDto } from './dtos/find-qc-test-query.dto';

@Controller('qc-tests')
export class QCTestsController {

    constructor(private readonly qcTestsService: QCTestsService) {
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
        @Body() createQcTestDto: CreateQCTestDto) { // TODO. Validate the dto
        return this.qcTestsService.create(createQcTestDto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Patch(':id')
    public update(@Param('id', ParseIntPipe) id: number, @Body() createQcTestDto: CreateQCTestDto) { // TODO. Validate the dto
        return this.qcTestsService.update(id, createQcTestDto);
    }

    @Admin()
    @Delete(':id')
    public delete(@Param('id', ParseIntPipe) id: number) {
        return this.qcTestsService.delete(id);
    }


}
