
import { ConnectorTypeEnum } from "./connector-type.enum";
import { ConnectorParameters } from "./create-connector-specification.model";
import { ConnectorProtocolEnum } from "./connector-protocol.enum";

export interface ViewConnectorSpecificationModel {
    id: number;
    name: string;
    description: string | null;
    connectorType: ConnectorTypeEnum; 
    protocol: ConnectorProtocolEnum;
    timeout: number;
    maximumRetries: number;
    cronSchedule: string;
    parameters: ConnectorParameters;
    disabled: boolean;
    comment: string | null;
}
