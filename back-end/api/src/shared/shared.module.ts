import { Module } from '@nestjs/common';
import { FileIOService } from './services/file-io.service';
import { AdapterRunnerService } from './services/adapter-runner.service';

@Module({
    providers: [FileIOService, AdapterRunnerService],
    exports: [FileIOService, AdapterRunnerService],
})
export class SharedModule {
}
