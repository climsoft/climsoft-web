import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SourceTypeEntity } from './entities/source-types.entity';
import { SourceEntity } from './entities/source.entity';
import { SourcesService } from './sources.service';
import { SourcesController } from './sources.controller';

@Module({
    imports: [TypeOrmModule.forFeature([SourceTypeEntity, SourceEntity])],
    controllers: [SourcesController],
    providers: [SourcesService]
})
export class SourceModule {}
