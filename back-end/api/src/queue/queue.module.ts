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
import { ConnectorExecutionLogEntity } from './entity/connector-execution-log.entity';
import { ConnectorExecutionLogService } from './services/connector-execution-log.service';
import { JobQueueController } from './controllers/job-queue.controller';
import { ConnectorExecutionLogsController } from './controllers/connector-execution-logs.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            JobQueueEntity,
            ConnectorExecutionLogEntity,
        ]),
        SharedModule,
        UserModule,
        ConnectorSpecificationsModule,
        MetadataModule,
        ObservationModule,
    ],
    controllers: [
        JobQueueController,
        ConnectorExecutionLogsController,
    ],
    providers: [
        JobQueueService,
        JobQueueProcessorService,
        ConnectorSchedulerService,
        ConnectorExecutionLogService,
        ConnectorImportProcessorService,
        ConnectorExportProcessorService,
    ],
    exports: [
        JobQueueService,
        ConnectorSchedulerService,
    ],
})
export class QueueModule { }
