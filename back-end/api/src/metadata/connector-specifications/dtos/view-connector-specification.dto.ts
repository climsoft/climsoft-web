import { ConnectorTypeEnum } from "../enums/connector-type.enum";
import { ProtocolEnum } from "../enums/protocol.enum";

export class ViewConnectorSpecificationDto {
    id: number;
    name: string;
    description: string | null;
    connectorType: ConnectorTypeEnum;
    serverIPAddress: string;
    protocol: ProtocolEnum;
    port: number;
    username: string;
    password: string; // TODO: Consider excluding password in view DTO for security
    timeout: number;
    maximumRetries: number;
    cronSchedule: string; 
    specificationIds: number[];
    extraMetadata: any | null;
    disabled: boolean;
    comment: string | null;
}
