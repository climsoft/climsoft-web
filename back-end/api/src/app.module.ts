import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm'; 
import { SharedModule } from './shared/shared.module';
import { ObservationModule } from './observation/observation.module';
import { FileController } from './file.controller';
import { MetadataModule } from './metadata/metadata.module';

@Module({
  imports: [
    SharedModule, MetadataModule, ObservationModule,
    TypeOrmModule.forRoot({
      type: 'mariadb', // type of our database
      host: 'localhost', // database host
      port: 3306, // database host
      username: 'root', // username
      password: 'P@trickm!', // user password
      database: 'mariadb_climsoft_db_v4', // name of our database,
      autoLoadEntities: true, // models will be loaded automatically
      synchronize: true, // your entities will be synced with the database(recommended: disable in prod)
     // timezone: 'Z', //todo. do more research about it. It affects how dates are saved in the database
    }),
    MetadataModule,  

  ],
  controllers: [AppController, FileController],
  providers: [AppService],
})
export class AppModule { }
