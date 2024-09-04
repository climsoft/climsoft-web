
import { Get, Post, Delete, Param, Body, Req, Patch, Query, DefaultValuePipe, ParseArrayPipe } from '@nestjs/common';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';
import { Admin } from 'src/user/decorators/admin.decorator'; 
import { IBaseStringService } from '../services/base-string-service.interface';


export abstract class BaseStringController<C, U,V> {

    constructor(private readonly baseService: IBaseStringService<C,U, V>) { }

    @Get()
    async find(
        @Query('ids',
            new DefaultValuePipe([]),
            new ParseArrayPipe({ items: Number, separator: "," })) ids: string[]): Promise<V[]> {
        if (ids.length > 0) {
            return this.baseService.findSome(ids);
        }
        return this.baseService.findAll();
    }

    @Get(':id')
    async findOne(
        @Param('id') id: string): Promise<V> {
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
        @Param('id') id: string,
        @Body() item: U): Promise<V> {
        return this.baseService.update(id, item, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Delete(':id')
    async delete(
        @Req() request: Request,
        @Param('id') id: string): Promise<string> {
        return this.baseService.delete(id, AuthUtil.getLoggedInUserId(request));
    }
}


