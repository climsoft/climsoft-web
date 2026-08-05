import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from "@nestjs/common";
import { Admin } from "src/user/decorators/admin.decorator";
import { AuthUtil } from "src/user/services/auth.util";
import { CreateUpdateProductDto } from "../dtos/create-update-product.dto";
import { ProductsService } from "../services/products.service";
import { Request } from 'express';

@Controller("products")
export class ProductsController {

    constructor(private readonly productsService: ProductsService) { }

    @Get()
    findForUser() {
        return this.productsService.findForUser();
    }

    @Admin()
    @Get("all")
    findAll() {
        return this.productsService.findAll();
    }

    @Get(":id")
    findOne(@Param("id", ParseIntPipe) id: number) {
        return this.productsService.findOneForUser(id);
    }

    @Get(":id/guest-token")
    getGuestToken(
        @Req() request: Request,
        @Param("id", ParseIntPipe) id: number
    ) {
        return this.productsService.getGuestToken(id, AuthUtil.getLoggedInUser(request));
    }

    @Admin()
    @Post()
    create(@Req() request: Request, @Body() dto: CreateUpdateProductDto) {
        return this.productsService.add(dto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Patch(":id")
    update(
        @Req() request: Request,
        @Param("id", ParseIntPipe) id: number,
        @Body() dto: CreateUpdateProductDto
    ) {
        return this.productsService.update(id, dto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number) {
        return this.productsService.delete(id);
    }

}
