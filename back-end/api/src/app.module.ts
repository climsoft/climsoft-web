import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservationModule } from './observation/observation.module';
import { FileController } from './file.controller';
import { MetadataModule } from './metadata/metadata.module';
import { UserModule } from './user/user.module';
import { UsersService } from './user/services/users.service';
import { UserRoleEnum } from './user/enums/user-roles.enum';

@Module({
  imports: [
    UserModule, MetadataModule, ObservationModule,
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST ? process.env.DB_HOST : "localhost",
      port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
      username: process.env.DB_USERNAME ? process.env.DB_USERNAME : "postgres",
      password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD : "password",
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

  constructor(private readonly userService: UsersService) { }

  async onModuleInit() {
    // Call the seed methods
    //console.log("module initialised");
    this.seedFirstUser();

    // TODO. call other seed methods like elements etc

  }

  private async seedFirstUser() {
    const users = await this.userService.findAll();
    if (users.length === 0) {
      const newUser = await this.userService.createUser(
        {
          name: "admin",
          email: "admin@climsoft.org",
          phone: '',
          role: UserRoleEnum.ADMINISTRATOR,
          authorisedStationIds: null,
          canDownloadData: false,
          authorisedElementIds: null,
          extraMetadata: null,
          disabled: false
        }
      );

      this.userService.changeUserPassword({ userId: newUser.id, password: "climsoft@admin!2" })
    }
  }

}
