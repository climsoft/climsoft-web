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

@Module({
  imports: [
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
      username: AppConfig.dbCredentials.username  ,
      password: AppConfig.dbCredentials.password ,
      database: AppConfig.dbCredentials.database ,
      autoLoadEntities: true, // models will be loaded automatically
      synchronize: AppConfig.devMode, // in dev mode synce entities with the database but in production disable
      // TODO. Investigate whether we should increase the connection pool size after monitoring the connection pool utilisation.
    }),

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
}
