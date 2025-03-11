import { Body, Controller, Get, Param, Patch, Post, Req, Res, } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { Request, Response } from 'express';
import { Admin } from '../decorators/admin.decorator';
import { Public } from '../decorators/public.decorator';
import { AuthUtil } from '../services/auth.util';
import { LogInCredentialsDto } from '../dtos/login-credentials.dto';
import { ChangePasswordDto } from '../dtos/change-password.dto';

@Controller('users')
export class UsersController {
    constructor(private readonly userService: UsersService,) { }

    @Admin()
    @Get()
    public getUsers() {
        return this.userService.findAll();
    }

    @Admin()
    @Get(':id')
    public getUser(@Param('id') id: number) {
        return this.userService.findOne(id);
    }

    @Admin()
    @Post('create')
    public create(@Body() createUserDto: CreateUserDto) {
        return this.userService.createUser(createUserDto);
    }

    @Admin()
    @Patch('update/:id')
    update(@Param('id') userId: number, @Body() createUserDto: CreateUserDto) {
        return this.userService.updateUser(userId, createUserDto);
    }

    @Admin()
    @Patch('change-password')
    public changePassword(@Body() changedPassword: ChangePasswordDto) {
        return this.userService.changeUserPassword(changedPassword);
    }

    @Public()
    @Post('login')
    public async login(
        @Req() request: Request,
        @Body() loginCredentials: LogInCredentialsDto) {
        return AuthUtil.createNewSessionUser(request, await this.userService.findUserByCredentials(loginCredentials));
    }

    @Post('logout')
    public logout(@Req() req: Request, @Res() res: Response) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).send('Failed to destroy session.');
            }
            res.clearCookie('connect.sid'); // Clears the cookie storing the session ID 
            return res.status(200).send(JSON.stringify({ message: 'success' }));
        });
    }

    // TODO. Do deleting of users. User should only be deleted when they have no records linked to them
    // Note also they should not have a history of changes as well.

}
