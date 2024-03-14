import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dtos/create-user.dto';
import { ViewUserDto } from '../dtos/view-user.dto';
import { LogInCredentialsDto } from '../dtos/login-credentials.dto';

@Injectable()
export class UsersService {

    constructor( 
        @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,) {
    }

    public async getUsers(): Promise<ViewUserDto[]> {
        const userEntities = await this.userRepo.find();
        return userEntities.map(entity => ({
            id: entity.id,
            name: entity.name,
            email: entity.email,
            phone: entity.phone,
            role: entity.role,
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
            role: userEntity.role,
            authorisedStationIds: userEntity.authorisedStationIds,
            extraMetadata: userEntity.extraMetadata,
            disabled: userEntity.disabled,
        };
        return createUser;
    }

    public async createUser(createUserDto: CreateUserDto): Promise<CreateUserDto> {

        console.log("createUserDto", createUserDto);

        // TODO. Check for phone as well, because phone number could be used to login into the sytem
        let userEntity = await this.userRepo.findOneBy({
            email: createUserDto.email,
        });

        if (userEntity) {
            throw new BadRequestException('email exists');
        }

        userEntity = this.userRepo.create();

        userEntity.password = '123';// TODO. create a random hashed password that will be emailed to the user
        this.updateUserEntity(userEntity, createUserDto);
       
        await this.userRepo.save(userEntity);

        // TODO. Send a email with password

        return createUserDto
    }

    async updateUser(id: number, createUserDto: CreateUserDto) {

        const userEntity = await this.userRepo.findOneBy({
            id: id,
        });

        if (!userEntity) {
            // TODO. throw error to show username already takem
            throw new NotFoundException('no user found');
        }

        // TODO. Check if email and phone number already used in database
        // TODO. Check if any changes have been made and log the changes

        this.updateUserEntity(userEntity, createUserDto);

        return this.userRepo.save(userEntity);
    }

    private updateUserEntity(entity: UserEntity, dto: CreateUserDto): void {
        entity.name = dto.name;
        entity.email = dto.email;
        entity.phone = dto.phone;
        entity.role = dto.role;
        entity.authorisedStationIds = dto.authorisedStationIds ? dto.authorisedStationIds : null;
        entity.extraMetadata = dto.extraMetadata;
        entity.disabled = dto.disabled;
        entity.entryDateTime = new Date();
    }

    public async getUserByCredentials(loginCredentials: LogInCredentialsDto): Promise<UserEntity> {
        const userEntity: UserEntity | null = await this.userRepo.findOneBy(
            { email: loginCredentials.email, password: loginCredentials.password });

        if (!userEntity) {
            throw new NotFoundException('INVALID_CREDENTIALS');
        }
        return userEntity;


    }




}
