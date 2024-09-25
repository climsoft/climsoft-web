import { Body, Controller, Get, Param, Patch, Post, Req, } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { Request } from 'express';
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
    @Get('/:id')
    public getUser(@Param('id') id: number) {
        return this.userService.findOne(id);
    }

    @Admin()
    @Post('/create')
    public create(@Body() createUserDto: CreateUserDto) {
        return this.userService.createUser(createUserDto);
    }

    @Admin()
    @Patch('/update/:id')
    update(@Param('id') userId: number, @Body() createUserDto: CreateUserDto) {
        return this.userService.updateUser(userId, createUserDto);
    }

    @Admin()
    @Patch('/change-password')
    public changePassword( @Body() changedPassword: ChangePasswordDto) { 
        return this.userService.changeUserPassword(changedPassword);
    }

    @Public()
    @Post('/login')
    public async login(
        @Req() request: Request,
        @Body() loginCredentials: LogInCredentialsDto) {
        return AuthUtil.createNewSessionUser(request, await this.userService.findUserByCredentials(loginCredentials));
    }



    @Post('/logout')
    public logout() {

        // console.log('log out')
        // //destroy the cookie
        // request.session.destroy(err =>{
        //     if(err){
        //         console.log('error')
        //         // TODO. log error?
        //     }
        // });

        //TODO. name should come from config file
        //TODO. debug time issue, what should be returned after accessing response this
        //check nestjs docs
        //response.clearCookie('ssid');

        return { message: 'success' };
    }


}
