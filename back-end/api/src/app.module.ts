import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservationModule } from './observation/observation.module';
import { MetadataModule } from './metadata/metadata.module';
import { UserModule } from './user/user.module';
import { SettingsModule } from './settings/settings.module';
import { MigrationsModule } from './migrations/migrations.module';
import { AppConfig } from './app.config';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    UserModule,
    MetadataModule,
    ObservationModule,
    SettingsModule,
    MigrationsModule,
    MetadataModule,
    TypeOrmModule.forRoot({
      type: "postgres",
      host: AppConfig.dbCredentials.host,
      port: AppConfig.dbCredentials.port,
      username: AppConfig.dbCredentials.username,
      password: AppConfig.dbCredentials.password,
      database: AppConfig.dbCredentials.database,
      autoLoadEntities: true, // models will be loaded automatically
      synchronize: AppConfig.firstInstall, // for first installs sync entities with the database but for updates, the api will manage the table creations and migrations
      // TODO. Investigate whether we should increase the connection pool size after monitoring the connection pool utilisation.
      //logging: true,
    }),

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
}
