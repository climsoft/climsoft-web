import { CreateUpdateProductDto } from "./create-update-product.dto";

export class ViewProductDto extends CreateUpdateProductDto {
    id!: number;
    systemKey!: string | null;
}
