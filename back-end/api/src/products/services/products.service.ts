import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LoggedInUserDto } from "src/user/dtos/logged-in-user.dto";
import { Repository } from "typeorm";
import { CreateUpdateProductDto } from "../dtos/create-update-product.dto";
import { ViewProductDto } from "../dtos/view-product.dto";
import { ClimateProductEntity } from "../entities/climate-product.entity";
import { SupersetService } from "./superset.service";

@Injectable()
export class ProductsService {

    constructor(
        @InjectRepository(ClimateProductEntity)
        private readonly productsRepo: Repository<ClimateProductEntity>,
        private readonly supersetService: SupersetService,
    ) { }

    async findForUser(): Promise<ViewProductDto[]> {
        const entities = await this.productsRepo.find({
            where: { disabled: false },
            order: { category: "ASC", name: "ASC" },
        });
        return entities.map(e => this.toViewDto(e));
    }

    async findAll(): Promise<ViewProductDto[]> {
        const entities = await this.productsRepo.find({ order: { category: "ASC", name: "ASC" } });
        return entities.map(e => this.toViewDto(e));
    }

    async findOne(id: number): Promise<ViewProductDto> {
        const entity = await this.productsRepo.findOneBy({ id });
        if (!entity) throw new NotFoundException(`Climate Product #${id} not found`);
        return this.toViewDto(entity);
    }

    async add(dto: CreateUpdateProductDto, userId: number): Promise<ViewProductDto> {
        const entity = this.productsRepo.create({
            ...dto,
            systemKey: null,
            entryUserId: userId,
        });
        const saved = await this.productsRepo.save(entity);
        return this.toViewDto(saved);
    }

    async update(id: number, dto: CreateUpdateProductDto, userId: number): Promise<ViewProductDto> {
        const entity = await this.productsRepo.findOneBy({ id });
        if (!entity) throw new NotFoundException(`Climate Product #${id} not found`);

        if (entity.systemKey !== null) {
            // Shipped products: only allow toggling disabled state
            entity.disabled = dto.disabled;
        } else {
            Object.assign(entity, dto);
        }
        entity.entryUserId = userId;

        const saved = await this.productsRepo.save(entity);
        return this.toViewDto(saved);
    }

    async upsertSystemProduct(
        systemKey: string,
        supersetUuid: string,
        name: string,
        description: string | null,
        category: string | null,
        userId: number,
    ): Promise<void> {
        const existing = await this.productsRepo.findOneBy({ systemKey });
        if (existing) {
            existing.supersetUuid = supersetUuid;
            existing.name = name;
            existing.description = description;
            existing.category = category;
            existing.entryUserId = userId;
            await this.productsRepo.save(existing);
        } else {
            const entity = this.productsRepo.create({
                systemKey,
                supersetUuid,
                name,
                description,
                category,
                disabled: false,
                entryUserId: userId,
            });
            await this.productsRepo.save(entity);
        }
    }

    async delete(id: number): Promise<number> {
        const entity = await this.productsRepo.findOneBy({ id });
        if (!entity) throw new NotFoundException(`Climate Product #${id} not found`);
        await this.productsRepo.remove(entity);
        return id;
    }

    async findOneForUser(id: number): Promise<ViewProductDto> {
        const entity = await this.productsRepo.findOneBy({ id, disabled: false });
        if (!entity) throw new NotFoundException(`Climate Product #${id} not found`);
        return this.toViewDto(entity);
    }

    async getGuestToken(productId: number, user: LoggedInUserDto): Promise<{ token: string; supersetUuid: string }> {
        const entity = await this.productsRepo.findOneBy({ id: productId, disabled: false });
        if (!entity) throw new NotFoundException(`Climate Product #${productId} not found`);

        const rls = this.buildRls(user);
        const token = await this.supersetService.generateGuestToken(entity.supersetUuid, rls);
        return { token, supersetUuid: entity.supersetUuid };
    }

    private buildRls(user: LoggedInUserDto): { clause: string }[] {
        if (user.isSystemAdmin) return [];

        const permissions = user.permissions;
        if (!permissions) return [{ clause: "1=0" }];

        const stationIds = new Set<string>([
            ...(permissions.entryPermissions?.stationIds ?? []),
            ...(permissions.qcPermissions?.stationIds ?? []),
            ...(permissions.ingestionMonitoringPermissions?.stationIds ?? []),
        ]);

        if (stationIds.size === 0) return [{ clause: "1=0" }];

        const list = [...stationIds].map(id => `'${id.replace(/'/g, "''")}'`).join(",");
        return [{ clause: `station_id IN (${list})` }];
    }

    private toViewDto(entity: ClimateProductEntity): ViewProductDto {
        return {
            id: entity.id,
            systemKey: entity.systemKey,
            supersetUuid: entity.supersetUuid,
            name: entity.name,
            description: entity.description,
            category: entity.category,
            disabled: entity.disabled,
        };
    }

}
