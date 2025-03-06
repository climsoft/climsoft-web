import { Body, Controller, Get, Param, Patch, Post, } from '@nestjs/common';
import { Admin } from '../decorators/admin.decorator';
import { UserGroupsService } from '../services/user-groups.service';
import { CreateUserGroupDto } from '../dtos/create-user-group.dto';

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
    public createUserGroup(@Body() createUserGroupDto: CreateUserGroupDto) {
        return this.userService.createUserGroup(createUserGroupDto);
    }

    @Admin()
    @Patch('update/:id')
    updateUserGroup(
        @Param('id') userId: number,
        @Body() createUserGroupDto: CreateUserGroupDto) {
        return this.userService.updateUserGroup(userId, createUserGroupDto);
    }

    // TODO. Implement deleting of user groups. 

}
