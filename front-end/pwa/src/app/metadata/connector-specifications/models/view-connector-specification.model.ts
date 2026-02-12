
import { CreateConnectorSpecificationModel } from "./create-connector-specification.model";

export interface ViewConnectorSpecificationModel extends CreateConnectorSpecificationModel {
    id: number;
    entryUserId: number;
    log: any[] | null;
}
