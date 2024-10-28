import { Module } from '@nestjs/common'; 
import { FileIOService } from './services/file-io.service';

@Module({
    providers: [FileIOService],   
    exports: [FileIOService]
})
export class SharedModule {


}
