import { BaseLogVo } from "src/shared/entity/app-base-entity";
import { CreateConnectorSpecificationDto } from "./create-connector-specification.dto";

export class ViewConnectorSpecificationDto extends CreateConnectorSpecificationDto {
    id: number;
    entryUserId: number;
    log: BaseLogVo[] | null;
}
