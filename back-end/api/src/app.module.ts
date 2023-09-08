import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationsModule } from './station/stations.module';
import { SourceModule } from './source/source.module';
import { ElementsModule } from './element/elements.module';
import { DataentryModule } from './dataentry/dataentry.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    SharedModule, SourceModule, StationsModule, ElementsModule, DataentryModule,
    TypeOrmModule.forRoot({
      type: 'mariadb', // type of our database
      host: 'localhost', // database host
      port: 3306, // database host
      username: 'root', // username
      password: 'P@trickm!', // user password
      database: 'mariadb_climsoft_db_v4', // name of our database,
      autoLoadEntities: true, // models will be loaded automatically
      synchronize: true, // your entities will be synced with the database(recommended: disable in prod)
    }),  

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
