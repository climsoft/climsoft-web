import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserModule } from "src/user/user.module";
import { ProductsController } from "./controllers/products.controller";
import { ClimateProductEntity } from "./entities/climate-product.entity";
import { ProductsService } from "./services/products.service";
import { SupersetService } from "./services/superset.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([ClimateProductEntity]),
        UserModule,
    ],
    controllers: [ProductsController],
    providers: [ProductsService, SupersetService],
    exports: [ProductsService],
})
export class ProductsModule { }
