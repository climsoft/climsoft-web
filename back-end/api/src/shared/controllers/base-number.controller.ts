
import { Get, Post, Delete, Param, Body, Req, ParseIntPipe, Patch, ParseArrayPipe, DefaultValuePipe, Query } from '@nestjs/common';
import { Request } from 'express';
import { IBaseNumberService } from '../services/base-number-service.interface.';
import { AuthUtil } from 'src/user/services/auth.util';
import { Admin } from 'src/user/decorators/admin.decorator';


export abstract class BaseNumberController<C, U, V> {

    constructor(private readonly baseService: IBaseNumberService<C,U,V>) { }

    @Get()
    async find(
        @Query('ids',
            new DefaultValuePipe([]),
            new ParseArrayPipe({ items: Number, separator: "," })) ids: number[]): Promise<V[]> {
        if (ids.length > 0) {
            return this.baseService.findSome(ids);
        }
        return this.baseService.findAll();
    }

    @Get(':id')
    async findOne(
        @Param('id', ParseIntPipe) id: number): Promise<V> {
        return this.baseService.findOne(id);
    }

    @Admin()
    @Post()
    async create(
        @Req() request: Request,
        @Body() item: C): Promise<V> {
        return this.baseService.create(item, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Patch(':id')
    async update(
        @Req() request: Request,
        @Param('id', ParseIntPipe) id: number,
        @Body() item: U): Promise<V> {
        return this.baseService.update(id, item, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Delete(':id')
    async delete(
        @Req() request: Request,
        @Param('id', ParseIntPipe) id: number): Promise<number> {
        return this.baseService.delete(id, AuthUtil.getLoggedInUserId(request));
    }
}


