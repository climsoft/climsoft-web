import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dtos/create-user.dto';
import { ViewUserDto } from '../dtos/view-user.dto';
import { LogInCredentialsDto } from '../dtos/login-credentials.dto';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(@InjectRepository(UserEntity) private userRepo: Repository<UserEntity>) { }

    public async count(): Promise<number> {
        return this.userRepo.count()
    }

    public async findAll(): Promise<ViewUserDto[]> {
        const userEntities = await this.userRepo.find(
            {
                order: {
                    id: 'ASC'
                }
            }
        );
        return userEntities.map(entity => this.getUserDto(entity));
    }

    public async findOne(userId: number): Promise<ViewUserDto> {
        const userEntity = await this.userRepo.findOneBy({ id: userId });

        if (!userEntity) {
            throw new BadRequestException('no such user');
        }

        return this.getUserDto(userEntity);
    }

    public async createUser(createUserDto: CreateUserDto): Promise<ViewUserDto> {
        let userEntity = await this.userRepo.findOneBy({
            email: createUserDto.email,
        });

        if (userEntity) {
            throw new BadRequestException('email exists');
        }

        userEntity = this.userRepo.create();

        this.updateUserEntity(userEntity, createUserDto);

        // TODO. In future email password to  user
        userEntity.hashedPassword = await this.hashPassword(this.generateRandomPassword());

        // TODO. Send a email with password
        return this.getUserDto(await this.userRepo.save(userEntity));
    }

    /**
     * Generates and returns a random password of 6 characters
     * @returns password
     */
    private generateRandomPassword(): string {
        const length: number = 12;
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
        return Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
    }

    public async updateUser(id: number, createUserDto: CreateUserDto): Promise<ViewUserDto> {
        const userEntity = await this.userRepo.findOneBy({
            id: id,
        });

        if (!userEntity) {
            throw new NotFoundException('no user found');
        }

        // TODO. Check if email and phone number already used in database 
        this.updateUserEntity(userEntity, createUserDto);

        return this.getUserDto(await this.userRepo.save(userEntity));
    }

    public async changeUserPassword(changedPassword: ChangePasswordDto): Promise<ViewUserDto> {
        const userEntity = await this.userRepo.findOneBy({
            id: changedPassword.userId,
        });

        if (!userEntity) {
            throw new NotFoundException('no user found');
        }

        userEntity.hashedPassword = await this.hashPassword(changedPassword.password);
        return this.getUserDto(await this.userRepo.save(userEntity));
    }

    public async findUserByCredentials(loginCredentials: LogInCredentialsDto): Promise<ViewUserDto> {
        // Get the user by email
        const userEntity: UserEntity | null = await this.userRepo.findOneBy(
            { email: loginCredentials.email }
        );

        // If user is not found or the password is incorrect, then return an invalid credentials execption.
        if (!userEntity || !await bcrypt.compare(loginCredentials.password, userEntity.hashedPassword)) {
            throw new NotFoundException('invalid_credentials');
        }

        if (userEntity.disabled) {
            throw new NotFoundException('disabled');
        }

        return this.getUserDto(userEntity);
    }

    private updateUserEntity(entity: UserEntity, dto: CreateUserDto): void {
        entity.name = dto.name;
        entity.email = dto.email;
        entity.phone = dto.phone;
        entity.isSystemAdmin = dto.isSystemAdmin;
        entity.permissions = dto.permissions;
        entity.groupId = dto.groupId;
        entity.extraMetadata = dto.extraMetadata;
        entity.disabled = dto.disabled;
        entity.comment = dto.comment;
    }

    private getUserDto(entity: UserEntity): ViewUserDto {
        return {
            id: entity.id,
            name: entity.name,
            email: entity.email,
            phone: entity.phone,
            isSystemAdmin: entity.isSystemAdmin,
            permissions: entity.permissions,
            groupId: entity.groupId,
            extraMetadata: entity.extraMetadata,
            disabled: entity.disabled,
            comment: entity.comment,
        }
    }


    private async hashPassword(password: string): Promise<string> {
        const saltRounds = 10; // You can adjust the salt rounds based on your security requirements
        return await bcrypt.hash(password, saltRounds);
    }


}
