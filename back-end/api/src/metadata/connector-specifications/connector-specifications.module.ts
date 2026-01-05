import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectorSpecificationEntity } from './entities/connector-specifications.entity';
import { ConnectorSpecificationsService } from './services/connector-specifications.service';
import { ConnectorSpecificationsController } from './controllers/connector-specifications.controller';
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ConnectorSpecificationEntity,
        ]),
        SharedModule,
        UserModule,
    ],
    controllers: [
        ConnectorSpecificationsController,
    ],
    providers: [
        ConnectorSpecificationsService,
    ],
    exports: [
        ConnectorSpecificationsService,
    ],
})
export class ConnectorSpecificationsModule { }
