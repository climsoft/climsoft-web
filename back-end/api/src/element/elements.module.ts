import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElementsService } from './elements.service';
import { ElementsController } from './elements.controller';
import { ElementEntity } from './entities/element.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ElementEntity])],
    controllers: [ElementsController],
    providers: [ElementsService]
})
export class ElementsModule { }
