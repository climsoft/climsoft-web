import { BaseLogVo } from "src/shared/entity/app-base-entity";
import { ConnectorParameters, ConnectorTypeEnum, EndPointTypeEnum } from "./create-connector-specification.dto";

export interface ViewConnectorSpecificationModel {
    id: number;
    name: string;

    description: string | null;

    connectorType: ConnectorTypeEnum;

    endPointType: EndPointTypeEnum;

    hostName: string;

    timeout: number; // in seconds

    maxAttempts: number;

    cronSchedule: string; // Cron pattern (e.g., '0 2 * * *' for 2 AM daily)

    parameters: ConnectorParameters;
    disabled: boolean;
    comment: string | null;
    entryUserId: number;
    log: BaseLogVo[] | null;
}
