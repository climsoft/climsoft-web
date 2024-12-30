import { Injectable, OnModuleInit } from '@nestjs/common';
import { MigrationsService } from './migrations/migrations.service';

@Injectable()
export class AppService  implements OnModuleInit {

  constructor( 
    private readonly migrationMetadataService: MigrationsService) { }

    async onModuleInit() {
      await this.migrationMetadataService.doMigrations();
    }
}
