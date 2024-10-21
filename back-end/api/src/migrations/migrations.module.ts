import { Module } from '@nestjs/common';
import { MigrationsService } from './migrations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseVersionEntity } from './entities/database-version.entity';
import { UserModule } from 'src/user/user.module';
import { SharedModule } from 'src/shared/shared.module';
import { SettingsModule } from 'src/settings/settings.module';
import { MetadataModule } from 'src/metadata/metadata.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            DatabaseVersionEntity,
        ]),
        SharedModule,
        UserModule,
        MetadataModule,
        SettingsModule,
    ],
    providers: [MigrationsService],
    exports: [MigrationsService]
})
export class MigrationsModule { }
