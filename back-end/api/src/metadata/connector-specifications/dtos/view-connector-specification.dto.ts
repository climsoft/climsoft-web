
import { CreateConnectorSpecificationDto } from "./create-connector-specification.dto";

export class ViewConnectorSpecificationDto extends CreateConnectorSpecificationDto {
    id: number; 
    entryUserId: number;
}
