import { Body, Controller, Get, Param, Patch, Post, Req, } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { LoggedInUserDto } from '../dtos/logged-in-user.dto';
import { CreateUserDto } from '../dtos/create-user.dto';
import { Request } from 'express';
import { Admin } from '../decorators/admin.decorator';
import { Public } from '../decorators/public.decorator';
import { AuthUtil } from '../services/auth.util';
import { UserEntity } from '../entities/user.entity';

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
    @Patch('/update/:id')
    update(@Param('id') id: number, @Body() createUserDto: CreateUserDto) {
        return this.userService.updateUser(id, createUserDto);
    }

    @Public()
    @Post('/login')
    public async login(@Req() request: Request, @Body() loginCredentials: { username: string, password: string }) {
       const userEntity: UserEntity =  await this.userService.getUserByCredentials(loginCredentials.username, loginCredentials.password);
       return AuthUtil.createNewSessionUser(request, userEntity);
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
