import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneralSettingEntity } from './entities/general-setting.entity'; 
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from 'src/user/user.module';
import { GeneralSettingController } from './controllers/general-settings.controller';
import { GeneralSettingsService } from './services/general-settings.service'; 
import { MetadataModule } from 'src/metadata/metadata.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            GeneralSettingEntity, 
        ]),
        SharedModule,
        UserModule,
        MetadataModule,
    ],
    controllers: [
        GeneralSettingController,
    ],
    providers: [
        GeneralSettingsService,
    ],
    exports: [
        GeneralSettingsService,
    ]
})
export class SettingsModule { }
