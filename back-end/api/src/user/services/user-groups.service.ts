import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserGroupEntity } from '../entities/user-group.entity';
import { ViewUserGroupDto } from '../dtos/view-user-group.dto';
import { CreateUserGroupDto } from '../dtos/create-user-group.dto';

@Injectable()
export class UserGroupsService {
    constructor(@InjectRepository(UserGroupEntity) private userRepo: Repository<UserGroupEntity>) { }

    public async count(): Promise<number> {
        return this.userRepo.count()
    }

    public async findAll(): Promise<ViewUserGroupDto[]> {
        const userEntities = await this.userRepo.find(
            {
                order: {
                    id: 'ASC'
                }
            }
        );
        return userEntities.map(entity => this.getUserGroupDto(entity));
    }

    public async findOne(userId: number): Promise<ViewUserGroupDto> {
        const userEntity = await this.userRepo.findOneBy({ id: userId });

        if (!userEntity) {
            throw new BadRequestException('no such user');
        }

        return this.getUserGroupDto(userEntity);
    }

    public async createUserGroup(createUserDto: CreateUserGroupDto): Promise<ViewUserGroupDto> {
        let userEntity = await this.userRepo.findOneBy({
            name: createUserDto.name,
        });

        if (userEntity) {
            throw new BadRequestException('email exists');
        }

        userEntity = this.userRepo.create();

        this.updateUserGroupEntity(userEntity, createUserDto);

        return this.getUserGroupDto(await this.userRepo.save(userEntity));
    }


    public async updateUserGroup(id: number, createUserDto: CreateUserGroupDto): Promise<ViewUserGroupDto> {
        const userEntity = await this.userRepo.findOneBy({
            id: id,
        });

        if (!userEntity) { 
            throw new NotFoundException('no user found');
        }

        // TODO. Check if email and phone number already used in database 
        this.updateUserGroupEntity(userEntity, createUserDto);

        return this.getUserGroupDto(await this.userRepo.save(userEntity));
    }

    private updateUserGroupEntity(entity: UserGroupEntity, dto: CreateUserGroupDto): void {
        entity.name = dto.name;
        entity.description = dto.description; 
        entity.permissions = dto.permissions; 
        entity.comment = dto.comment;
    }

    private getUserGroupDto(entity: UserGroupEntity): ViewUserGroupDto {
        return {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            permissions: entity.permissions, 
            comment: entity.comment,
        }
    }
}
