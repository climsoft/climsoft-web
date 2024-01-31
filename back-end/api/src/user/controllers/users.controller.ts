import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, Session } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { Public } from 'src/shared/decorators/public.decorator';
import { Admin } from 'src/shared/decorators/admin.decorator';
import { LoggedInUserDto } from '../dtos/logged-in-user.dto';
import { CreateUserDto } from '../dtos/create-user.dto';
import { Request } from 'express';

@Controller('users')
export class UsersController {
    constructor(private readonly userService: UsersService,) { }

    @Admin()
    @Get()
    public getUsers() {
        return this.userService.getUsers();
    }

    @Admin()
    @Get('/:id')
    public getUser(@Param('id') id: number) {
        return this.userService.getUser(id);
    }

    @Admin()
    @Post('/create')
    public create(@Body() createUserDto: CreateUserDto) {
        return this.userService.createUser(createUserDto);
    }

    @Admin()
    @Patch(':id')
    update(@Param('id') id: number, @Body() createUserDto: CreateUserDto) {
        return this.userService.updateUser(id, createUserDto);
    }


    @Public()
    @Post('/login')
    public login(@Req() request: Request, @Body() loginCredentials: { username: string, password: string }) {
        return this.userService.loginUser(request, loginCredentials.username, loginCredentials.password);
    }

    @Post('/changeCredentials')
    public changeLoginCredentials(@Body() userCredentials: LoggedInUserDto) {
        //console.log('dtos', observationDtos);
        //return this.observationsService.save(observationDtos);
        return 'true';
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
