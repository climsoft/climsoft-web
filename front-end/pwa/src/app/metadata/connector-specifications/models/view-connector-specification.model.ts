
import { ConnectorParameters, ConnectorTypeEnum, ServerTypeEnum } from "./create-connector-specification.model";

export interface ViewConnectorSpecificationModel {
    id: number;
    name: string;

    description: string;

    connectorType: ConnectorTypeEnum;

    serverType: ServerTypeEnum;

    hostName: string;

    timeout: number; // in seconds

    retryAttempts: number;

    cronSchedule: string; // Cron pattern (e.g., '0 2 * * *' for 2 AM daily)

    parameters: ConnectorParameters;

    disabled: boolean;

    comment: string | null;
    entryUserId: number;
    log: any[] | null;
}
