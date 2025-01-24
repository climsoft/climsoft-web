import { Module } from '@nestjs/common';
import { MigrationsService } from './migrations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseVersionEntity } from './entities/database-version.entity';
import { UserModule } from 'src/user/user.module';
import { SharedModule } from 'src/shared/shared.module';
import { SettingsModule } from 'src/settings/settings.module';
import { MetadataModule } from 'src/metadata/metadata.module';
import { SqlScriptsModule } from 'src/sql-scripts/sql-scripts.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            DatabaseVersionEntity,
        ]),
        SharedModule,
        UserModule,
        MetadataModule,
        SettingsModule,
        SqlScriptsModule,
    ],
    providers: [MigrationsService],
    exports: [MigrationsService],
})
export class MigrationsModule { }
