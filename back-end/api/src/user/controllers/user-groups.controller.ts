import { Body, Controller, Get, Param, Patch, Post, Req, } from '@nestjs/common';
import { Admin } from '../decorators/admin.decorator';
import { UserGroupsService } from '../services/user-groups.service';
import { CreateUserGroupDto } from '../dtos/create-user-group.dto';
import { Request } from 'express';
import { AuthUtil } from '../services/auth.util';

@Controller('user-groups')
export class UserGroupsController {
    constructor(private readonly userService: UserGroupsService,) { }

    @Admin()
    @Get()
    public getUserGroups() {
        return this.userService.findAll();
    }

    @Admin()
    @Get(':id')
    public getUserGroup(@Param('id') id: number) {
        return this.userService.findOne(id);
    }

    @Admin()
    @Post('create')
    public createUserGroup(
         @Req() request: Request,
         @Body() createUserGroupDto: CreateUserGroupDto) {
        return this.userService.create(createUserGroupDto, AuthUtil.getLoggedInUserId(request));
    }

    @Admin()
    @Patch('update/:id')
    updateUserGroup(
        @Req() request: Request,
        @Param('id') userGroupId: number,
        @Body() createUserGroupDto: CreateUserGroupDto) {
        return this.userService.update(userGroupId, createUserGroupDto, AuthUtil.getLoggedInUserId(request));
    }

    // TODO. Implement deleting of user groups. 

}
