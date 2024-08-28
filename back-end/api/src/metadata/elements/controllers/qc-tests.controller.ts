import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common'; 
import { Admin } from 'src/user/decorators/admin.decorator'; 
import { QCTestsService } from '../services/qc-tests.service';
import { CreateQCTestDto } from '../dtos/qc-tests/create-qc-test.dto';
import { QCTestTypeEnum } from '../entities/qc-test-type.enum';
import { AuthUtil } from 'src/user/services/auth.util';
import { Request } from 'express';

@Controller('qc-tests')
export class QCTestsController {

    constructor(private readonly qcTestsService: QCTestsService) { }

    @Get()
    public findAll() {
        return this.qcTestsService.findAll();
    }

    @Get(':id')
    public find(@Param('id', ParseIntPipe) id: number) {
        return this.qcTestsService.find(id);
    }

    @Get('/qc-test-type/:id')
    public findQcTestsByType(@Param('id') id: QCTestTypeEnum) { // TODO validate enum. 
        return this.qcTestsService.findQCTestByType(id);
    }

    @Get('/element/:id')
    public findQcTestsByElement(@Param('id') elementId: number) { // TODO validate enum. 
        return this.qcTestsService.findQCTestByElement(elementId);
    }

    @Admin()
    @Post()
    public create(
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
