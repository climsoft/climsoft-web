import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dtos/create-user.dto';
import { ViewUserDto } from '../dtos/view-user.dto';
import { LogInCredentialsDto } from '../dtos/login-credentials.dto';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import * as bcrypt from 'bcrypt';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
        private eventEmitter: EventEmitter2,) { }

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
        return userEntities.map(entity => this.createViewDto(entity));
    }

    public async findOne(userId: number): Promise<ViewUserDto> {
        const userEntity = await this.userRepo.findOneBy({ id: userId });

        if (!userEntity) {
            throw new BadRequestException('no such user');
        }

        return this.createViewDto(userEntity);
    }

    public async create(createUserDto: CreateUserDto): Promise<ViewUserDto> {
        let entity = await this.userRepo.findOneBy({
            email: createUserDto.email,
        });

        if (entity) {
            throw new BadRequestException('email exists');
        }

        entity = this.userRepo.create();

        this.updateEntityWithDtoInfo(entity, createUserDto);

        // TODO. In future email password to  user
        entity.hashedPassword = await this.hashPassword(this.generateRandomPassword());

        await this.userRepo.save(entity)

        const viewDto: ViewUserDto = this.createViewDto(entity)

        this.eventEmitter.emit('user.created', { id: entity.id, viewDto });

        // TODO. Send a email with password

        return viewDto;
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

    public async update(id: number, createUserDto: CreateUserDto): Promise<ViewUserDto> {
        const entity = await this.userRepo.findOneBy({
            id: id,
        });

        if (!entity) {
            throw new NotFoundException('no user found');
        }

        // TODO. Check if email and phone number already used in database 
        this.updateEntityWithDtoInfo(entity, createUserDto);

        await this.userRepo.save(entity)

        const viewDto: ViewUserDto = this.createViewDto(entity);

        this.eventEmitter.emit('user.updated', { id, viewDto });

        return viewDto;
    }

    public async changeUserPassword(changedPassword: ChangePasswordDto): Promise<ViewUserDto> {
        const userEntity = await this.userRepo.findOneBy({
            id: changedPassword.userId,
        });

        if (!userEntity) {
            throw new NotFoundException('no user found');
        }

        // TODO. Use the EncypUtils class for encyrpting passwords?
        userEntity.hashedPassword = await this.hashPassword(changedPassword.password);
        return this.createViewDto(await this.userRepo.save(userEntity));
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

        return this.createViewDto(userEntity);
    }

    private updateEntityWithDtoInfo(entity: UserEntity, dto: CreateUserDto): void {
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

    private createViewDto(entity: UserEntity): ViewUserDto {
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
