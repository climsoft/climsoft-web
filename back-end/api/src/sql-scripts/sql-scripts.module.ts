import { Module } from '@nestjs/common';
import { SqlScriptsLoaderService } from './sql-scripts-loader.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
    imports: [  
        SharedModule,
     ],
    controllers: [ ],
    providers: [
        SqlScriptsLoaderService,
    ],
    exports: [
        SqlScriptsLoaderService,
    ]
})
export class SqlScriptsModule { }
