import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobQueueEntity } from './entity/job-queue.entity';
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from 'src/user/user.module';
import { JobQueueService } from './services/job-queue.service';
import { JobQueueProcessorService } from './services/job-queue-processor.service';
import { ConnectorSchedulerService } from './services/connector-scheduler.service';
import { ConnectorImportProcessorService } from './services/connector-import-processor.service';
import { ConnectorExportProcessorService } from './services/connector-export-processor.service';
import { ConnectorSpecificationsModule } from 'src/metadata/connector-specifications/connector-specifications.module';
import { MetadataModule } from 'src/metadata/metadata.module';
import { ObservationModule } from 'src/observation/observation.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            JobQueueEntity,
        ]),
        SharedModule,
        UserModule,
        ConnectorSpecificationsModule,
        MetadataModule,
        ObservationModule,
    ],
    controllers: [],
    providers: [
        JobQueueService,
        JobQueueProcessorService,
        ConnectorSchedulerService,
        ConnectorImportProcessorService,
        ConnectorExportProcessorService,
    ],
    exports: [
        JobQueueService,
        ConnectorSchedulerService,
    ],
})
export class QueueModule { }
