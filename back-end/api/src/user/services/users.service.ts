import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LoggedInUserDto } from '../dtos/logged-in-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dtos/create-user.dto';
import { Request } from 'express';
import { ViewUserDto } from '../dtos/view-user.dto';
import { DateUtils } from 'src/shared/utils/date.utils';
import { AuthUtil } from './auth.util';


@Injectable()
export class UsersService {

    constructor(@InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>, 
     ) {
    }

    public async getUsers(): Promise<ViewUserDto[]> {
        const userEntities = await this.userRepo.find();
        return userEntities.map(entity => ({
            id: entity.id,
            name: entity.name,
            email: entity.email,
            phone: entity.phone,
            roleId: entity.roleId,
            disabled: entity.disabled,
        }));
    }

    public async getUser(userId: number): Promise<CreateUserDto> {
        const userEntity = await this.userRepo.findOneBy({ id: userId });

        if (!userEntity) {
            throw new BadRequestException('no such user');
        }

        const createUser: CreateUserDto = {
            name: userEntity.name,
            email: userEntity.email,
            phone: userEntity.phone,
            roleId: userEntity.roleId,
            authorisedStationIds: userEntity.authorisedStationIds ? JSON.parse(userEntity.authorisedStationIds) : null,
            extraMetadata: userEntity.extraMetadata,
            disabled: userEntity.disabled,
        };
        return createUser;
    }

    public async createUser(createUserDto: CreateUserDto): Promise<CreateUserDto> {

        // TODO. Check for phone as well, because phone number could be used to login into the sytem
        let userEntity = await this.userRepo.findOneBy({
            email: createUserDto.email,
        });

        if (userEntity) {
            // TODO. throw error to show username already takem
            throw new BadRequestException('username exists');
        }

        //id: 1, //TODO. after changing the id from being autoincrement, change this     
        userEntity = this.userRepo.create();

        this.updateUserEntity(userEntity, createUserDto);
        userEntity.password = '123';// TODO. create a random hashed password that will be emailed to the user

        await this.userRepo.save(userEntity);

        return createUserDto
    }

    async updateUser(id: number, createUserDto: CreateUserDto) {

        // TODO. Check for phone as well, because phone number could be used to login into the sytem
        const userEntity = await this.userRepo.findOneBy({
            id: id,
        });

        if (!userEntity) {
            // TODO. throw error to show username already takem
            throw new BadRequestException('no user found');
        }

        this.updateUserEntity(userEntity, createUserDto);

        return this.userRepo.save(userEntity);
    }

    private updateUserEntity(entity: UserEntity, dto: CreateUserDto): void {
        entity.name = dto.name;
        entity.email = dto.email;
        entity.phone = dto.phone;
        entity.roleId = dto.roleId;
        entity.authorisedStationIds = dto.authorisedStationIds ? JSON.stringify(dto.authorisedStationIds) : null;
        entity.extraMetadata = dto.extraMetadata;
        entity.disabled = dto.disabled;
        entity.entryDateTime = DateUtils.getTodayDateInSQLFormat();
    }

    public async getUserByCredentials( username: string, password: string): Promise<UserEntity> {
        const userEntity: UserEntity | null = await this.userRepo.findOneBy({ email: username, password: password });

        if (!userEntity) {
            throw new NotFoundException('INVALID_CREDENTIALS');
        }
      return  userEntity;


    }




}
