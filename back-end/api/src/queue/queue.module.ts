import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageQueueEntity } from './entity/message-queue.entity';
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from 'src/user/user.module'; 

@Module({
    imports: [
        TypeOrmModule.forFeature([
            MessageQueueEntity, 
        ]),
        SharedModule,
        UserModule, 
    ],
    controllers: [
       
    ],
    providers: [
       
    ],
})
export class QueueModule { }
