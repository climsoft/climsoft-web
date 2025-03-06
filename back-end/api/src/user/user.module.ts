import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { UserEntity } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';

import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { UserGroupEntity } from './entities/user-group.entity';
import { UserGroupsService } from './services/user-groups.service';
import { UserGroupsController } from './controllers/user-groups.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserGroupEntity, UserEntity]),
    SharedModule,
  ],
  providers: [
    UserGroupsService,
    UsersService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  controllers: [
    UsersController,
    UserGroupsController,
  ],
  exports: [
    UsersService
  ]
})
export class UserModule { }
