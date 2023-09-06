import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElementsService } from './elements.service';
import { ElementsController } from './elements.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Element])],
    controllers: [ElementsController],
    providers: [ElementsService]
})
export class ElementsModule { }
