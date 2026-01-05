import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageQueueEntity } from './entity/message-queue.entity';
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from 'src/user/user.module';
import { QueueService } from './services/queue.service';
import { QueueProcessorService } from './services/queue-processor.service';
import { ConnectorSchedulerService } from './services/connector-scheduler.service';
import { ConnectorImportProcessorService } from './services/connector-import-processor.service';
import { ConnectorExportProcessorService } from './services/connector-export-processor.service';
import { ConnectorSpecificationsModule } from 'src/metadata/connector-specifications/connector-specifications.module';
import { MetadataModule } from 'src/metadata/metadata.module';
import { ObservationModule } from 'src/observation/observation.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            MessageQueueEntity,
        ]),
        SharedModule,
        UserModule,
        ConnectorSpecificationsModule,
        MetadataModule,
        ObservationModule,
    ],
    controllers: [],
    providers: [
        QueueService,
        QueueProcessorService,
        ConnectorSchedulerService,
        ConnectorImportProcessorService,
        ConnectorExportProcessorService,
    ],
    exports: [
        QueueService,
        ConnectorSchedulerService,
    ],
})
export class QueueModule { }
