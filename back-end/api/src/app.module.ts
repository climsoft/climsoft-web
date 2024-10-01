import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservationModule } from './observation/observation.module';
import { FileController } from './file.controller';
import { MetadataModule } from './metadata/metadata.module';
import { UserModule } from './user/user.module'; 

@Module({
  imports: [
    UserModule, MetadataModule, ObservationModule,
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST ? process.env.DB_HOST : "localhost",
      port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
      username: process.env.DB_USERNAME ? process.env.DB_USERNAME : "my_user",
      password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD : "my_password",
      database: process.env.DB_NAME ? process.env.DB_NAME : "climsoft",
      autoLoadEntities: true, // models will be loaded automatically
      synchronize: true, // your entities will be synced with the database(TODO: disable in production)
      // TODO. Investigate whether we should increase the connection pool size after monitoring the connection pool utilisation.
    }),

  ],
  controllers: [AppController, FileController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {

  constructor(private readonly appService: AppService) { }

  async onModuleInit() {
    // Call the seed methods
    this.appService.seedDatabase();
  }



}
